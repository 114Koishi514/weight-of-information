using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Runtime.InteropServices;
using System.Threading;
using System.Web.Script.Serialization;

namespace InformationStation {
    public sealed class PrintFailure : Exception {
        public bool Uncertain;
        public PrintFailure(string message, bool uncertain) : base(message) { Uncertain = uncertain; }
    }
    public static class RasterPrinter {
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        private class DocInfo { [MarshalAs(UnmanagedType.LPWStr)] public string DocName; [MarshalAs(UnmanagedType.LPWStr)] public string OutputFile; [MarshalAs(UnmanagedType.LPWStr)] public string DataType; }
        [DllImport("winspool.drv", EntryPoint="OpenPrinterW", SetLastError=true, CharSet=CharSet.Unicode)] private static extern bool OpenPrinter(string name, out IntPtr printer, IntPtr defaults);
        [DllImport("winspool.drv", EntryPoint="StartDocPrinterW", SetLastError=true, CharSet=CharSet.Unicode)] private static extern int StartDocPrinter(IntPtr printer, int level, [In] DocInfo info);
        [DllImport("winspool.drv", SetLastError=true)] private static extern bool StartPagePrinter(IntPtr printer);
        [DllImport("winspool.drv", SetLastError=true)] private static extern bool WritePrinter(IntPtr printer, byte[] data, int count, out int written);
        [DllImport("winspool.drv", SetLastError=true)] private static extern bool EndPagePrinter(IntPtr printer);
        [DllImport("winspool.drv", SetLastError=true)] private static extern bool EndDocPrinter(IntPtr printer);
        [DllImport("winspool.drv", SetLastError=true)] private static extern bool AbortPrinter(IntPtr printer);
        [DllImport("winspool.drv", SetLastError=true)] private static extern bool ClosePrinter(IntPtr printer);
        public static byte[] BuildData(byte[] raster, int height) {
            if (height < 1 || height > 4096 || raster.Length != 48 * height) throw new ArgumentException("Invalid 384-dot raster.");
            using (MemoryStream data = new MemoryStream()) {
                data.Write(new byte[] {27,64,27,97,0},0,5);
                for (int row = 0; row < height; row += 128) {
                    int rows = Math.Min(128, height-row);
                    byte[] header = {29,118,48,0,48,0,(byte)(rows & 255),(byte)(rows >> 8)};
                    data.Write(header,0,header.Length); data.Write(raster,row*48,rows*48);
                }
                data.Write(new byte[] {27,100,3},0,3);
                return data.ToArray();
            }
        }
        public static int Send(string name, string id, byte[] raster, int height) {
            byte[] data = BuildData(raster,height); IntPtr printer; bool started=false;bool page=false;bool attempted=false;
            if(!OpenPrinter(name,out printer,IntPtr.Zero)) throw new PrintFailure("Windows could not open this printer queue. Error " + Marshal.GetLastWin32Error(),false);
            try {
                int job = StartDocPrinter(printer,1,new DocInfo {DocName="Information receipt " + id,OutputFile=null,DataType="RAW"});
                if(job==0) throw new PrintFailure("Windows could not create a print job. Error " + Marshal.GetLastWin32Error(),false);
                started=true;
                if(!StartPagePrinter(printer)) throw new PrintFailure("Windows could not begin the receipt.",false);
                page=true;int written;attempted=true;
                if(!WritePrinter(printer,data,data.Length,out written) || written!=data.Length) throw new PrintFailure("Windows did not acknowledge the full receipt. Check for partial output before repeating.",true);
                if(!EndPagePrinter(printer)) throw new PrintFailure("The printer page acknowledgement was lost. Check the paper before repeating.",true);
                page=false;
                if(!EndDocPrinter(printer)) throw new PrintFailure("The print job acknowledgement was lost. Check the paper before repeating.",true);
                started=false;return job;
            } catch(PrintFailure) { if(started) AbortPrinter(printer);throw; }
              catch(Exception error) { if(started) AbortPrinter(printer);throw new PrintFailure(error.Message,attempted); }
            finally { if(page) EndPagePrinter(printer);ClosePrinter(printer); }
        }
    }
    public static class Server {
        static string Root;static string Printer;static string State;static string Token;static object PrintLock=new object();
        static string Json(object data) { return new JavaScriptSerializer().Serialize(data); }
        static void Reply(NetworkStream stream,int status,string type,byte[] body) {
            string reason=status==200?"OK":status==400?"Bad Request":status==403?"Forbidden":status==404?"Not Found":status==409?"Conflict":"Service Unavailable";
            byte[] headers=Encoding.ASCII.GetBytes("HTTP/1.1 "+status+" "+reason+"\r\nContent-Type: "+type+"\r\nContent-Length: "+body.Length+"\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nX-Frame-Options: DENY\r\nConnection: close\r\n\r\n");
            stream.Write(headers,0,headers.Length);stream.Write(body,0,body.Length);stream.Flush();
        }
        static void Result(NetworkStream stream,int status,object data) { Reply(stream,status,"application/json; charset=utf-8",Encoding.UTF8.GetBytes(Json(data))); }
        static string Hash(byte[] data) { using(SHA256 hash=SHA256.Create()) { return BitConverter.ToString(hash.ComputeHash(data)).Replace("-",""); } }
        static void WriteState(string path,object value) {
            string temporary=path+".tmp";byte[] bytes=Encoding.UTF8.GetBytes(Json(value));
            using(FileStream file=new FileStream(temporary,FileMode.Create,FileAccess.Write,FileShare.None,4096,FileOptions.WriteThrough)){file.Write(bytes,0,bytes.Length);file.Flush(true);}
            if(File.Exists(path)) File.Replace(temporary,path,null);else File.Move(temporary,path);
        }
        static Dictionary<string,object> Parse(string text) { return new JavaScriptSerializer {MaxJsonLength=400000}.Deserialize<Dictionary<string,object>>(text); }
        static void Print(NetworkStream stream, string body) {
            Dictionary<string,object> data;
            string id;int height;byte[] raster;
            try {
                data=Parse(body); id=Convert.ToString(data["id"]);height=Convert.ToInt32(data["height"]);
                if(!System.Text.RegularExpressions.Regex.IsMatch(id,"^(EX-[A-F0-9]{10}|TEST-EX-[A-F0-9]{10})$") || Convert.ToInt32(data["width"])!=384 || height<1 || height>4096) throw new ArgumentException();
                raster=Convert.FromBase64String(Convert.ToString(data["raster"]));
                if(raster.Length!=48*height) throw new ArgumentException();
            }catch { Result(stream,400,new {error="Invalid receipt. Expected a 384-dot monochrome raster."});return; }
            string fingerprint=Hash(raster);string path=Path.Combine(State,id+".json");
            lock(PrintLock) {
                if(File.Exists(path)) {
                    Dictionary<string,object> existing=Parse(File.ReadAllText(path));
                    if(Convert.ToString(existing["hash"])!=fingerprint) { Result(stream,409,new {error="This receipt ID already belongs to different content.",uncertain=true});return; }
                    string state=Convert.ToString(existing["state"]);
                    if(state=="queued") { Result(stream,200,new {status="duplicate",id=id});return; }
                    if(state=="sending" || state=="uncertain") { Result(stream,409,new {error="A previous attempt may already have printed. Check the paper and restart with a new exchange only when appropriate.",uncertain=true});return; }
                }
                WriteState(path,new {id=id,hash=fingerprint,state="sending",at=DateTime.UtcNow.ToString("o")});
                try {
                    int job=RasterPrinter.Send(Printer,id,raster,height);
                    WriteState(path,new {id=id,hash=fingerprint,state="queued",job=job,at=DateTime.UtcNow.ToString("o")});
                    Console.WriteLine("[QUEUED] "+id+" / Windows job "+job);
                    Result(stream,200,new {status="queued",id=id,job=job});
                }catch(PrintFailure failure) {
                    WriteState(path,new {id=id,hash=fingerprint,state=failure.Uncertain?"uncertain":"rejected",at=DateTime.UtcNow.ToString("o")});
                    Console.WriteLine("[CHECK PRINTER] "+id+" / "+failure.Message);
                    Result(stream,503,new {error=failure.Message,uncertain=failure.Uncertain});
                }catch(Exception failure) {
                    Console.WriteLine("[CHECK PRINTER] "+id+" / "+failure.Message);
                    Result(stream,503,new {error="Printer acknowledgement could not be recorded. Check the paper before repeating.",uncertain=true});
                }
            }
        }
        static void Handle(object obj) {
            using(TcpClient client=(TcpClient)obj) {
                client.ReceiveTimeout=6000;client.SendTimeout=12000;
                using(NetworkStream stream=client.GetStream()) {
                    try {
                        MemoryStream head=new MemoryStream();int matched=0;byte[] terminator={13,10,13,10};
                        while(matched<4) {int next=stream.ReadByte();if(next<0)return;head.WriteByte((byte)next);matched=next==terminator[matched]?matched+1:next==13?1:0;if(head.Length>10000)throw new ArgumentException("Headers too large.");}
                        string[] lines=Encoding.ASCII.GetString(head.ToArray()).Split(new string[]{"\r\n"},StringSplitOptions.None);
                        string[] request=lines[0].Split(' ');if(request.Length!=3)throw new ArgumentException("Invalid request.");
                        Dictionary<string,string> headers=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase);
                        for(int i=1;i<lines.Length;i++){int colon=lines[i].IndexOf(':');if(colon>0)headers[lines[i].Substring(0,colon).Trim()]=lines[i].Substring(colon+1).Trim();}
                        string host; if(!headers.TryGetValue("Host",out host) || (host!="127.0.0.1:8765"&&host!="localhost:8765")) {Result(stream,403,new {error="Only loopback station access is allowed."});return;}
                        string origin;if(headers.TryGetValue("Origin",out origin) && origin!="http://127.0.0.1:8765" && origin!="http://localhost:8765") {Result(stream,403,new {error="Cross-origin requests are not allowed."});return;}
                        string fetchSite;if(headers.TryGetValue("Sec-Fetch-Site",out fetchSite)&&fetchSite=="cross-site") {Result(stream,403,new {error="Cross-site access is not allowed."});return;}
                        string path=Uri.UnescapeDataString(request[1].Split('?')[0]);
                        if(request[0]=="GET" && path=="/api/status") {Result(stream,200,new {ready=true,printer=Printer,token=Token,version="1.0.0"});return;}
                        if(request[0]=="POST" && path=="/api/print") {
                            string key;if(!headers.TryGetValue("X-Station-Token",out key)||key!=Token){Result(stream,403,new {error="Open the station webpage before printing."});return;}
                            string lengthText;int length;
                            if(!headers.TryGetValue("Content-Length",out lengthText)||!int.TryParse(lengthText,out length)||length<1||length>400000)throw new ArgumentException("Invalid request size.");
                            byte[] body=new byte[length];int offset=0;
                            while(offset<length){int amount=stream.Read(body,offset,length-offset);if(amount==0)throw new IOException("Incomplete request.");offset+=amount;}
                            Print(stream,Encoding.UTF8.GetString(body));return;
                        }
                        if(request[0]!="GET"){Result(stream,404,new {error="Unknown station route."});return;}
                        if(path=="/")path="/index.html";
                        string full=Path.GetFullPath(Path.Combine(Root,path.TrimStart('/').Replace('/',Path.DirectorySeparatorChar)));
                        if(!full.StartsWith(Root+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase)||!File.Exists(full)){Result(stream,404,new {error="File not found."});return;}
                        string ext=Path.GetExtension(full).ToLowerInvariant();string type;
                        switch(ext){case ".html":type="text/html; charset=utf-8";break;case ".js":type="text/javascript; charset=utf-8";break;case ".css":type="text/css; charset=utf-8";break;case ".ttf":type="font/ttf";break;case ".svg":type="image/svg+xml";break;case ".txt":type="text/plain; charset=utf-8";break;default:Result(stream,404,new {error="File type unavailable."});return;}
                        Reply(stream,200,type,File.ReadAllBytes(full));
                    }catch(Exception e) {try{Result(stream,400,new {error="Station request could not be completed."});}catch{} Console.WriteLine("[REQUEST] "+e.GetType().Name);}
                }
            }
        }
        public static void Run(string root,string printer,string state) {
            Root=Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar);Printer=printer;State=state;Directory.CreateDirectory(State);Token=Guid.NewGuid().ToString("N");
            TcpListener server=new TcpListener(IPAddress.Loopback,8765);server.Start();
            try {System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("http://127.0.0.1:8765/"){UseShellExecute=true});}catch{Console.WriteLine("Open http://127.0.0.1:8765/ in Chrome.");}
            Console.WriteLine("Station ready. A queued job is not proof of physical paper output.");
            try {while(true){TcpClient client=server.AcceptTcpClient();ThreadPool.QueueUserWorkItem(Handle,client);}}finally{server.Stop();}
        }
    }
}
