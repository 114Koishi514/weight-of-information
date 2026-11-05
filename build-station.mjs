import {mkdir,readFile,readdir,writeFile,copyFile,rm} from 'node:fs/promises';
import {resolve,join,relative} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=resolve(import.meta.dirname);
const staging=join(root,'.station-build');
await rm(staging,{recursive:true,force:true});await mkdir(join(staging,'Information_Station','www'),{recursive:true});
async function copyTree(from,to){await mkdir(to,{recursive:true});for(const e of await readdir(from,{withFileTypes:true})){if(e.name==='downloads')continue;const src=join(from,e.name),dest=join(to,e.name);if(e.isDirectory())await copyTree(src,dest);else await copyFile(src,dest);}}
await copyTree(join(root,'docs'),join(staging,'Information_Station','www'));
for(const name of await readdir(join(root,'station'))){const src=join(root,'station',name);let bytes=await readFile(src);if(/\.(cmd|ps1|cs|txt)$/.test(name))bytes=Buffer.from(bytes.toString('utf8').replace(/\r?\n/g,'\r\n'),'utf8');await writeFile(join(staging,'Information_Station',name),bytes);}
await mkdir(join(root,'docs','downloads'),{recursive:true});
const script=`import zipfile,pathlib,sys\nroot=pathlib.Path(sys.argv[1])\nout=pathlib.Path(sys.argv[2])\nwith zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:\n for p in sorted(root.rglob('*')):\n  if p.is_file():z.write(p,p.relative_to(root))\nwith zipfile.ZipFile(out) as z:\n assert z.testzip() is None\n print(str(out),out.stat().st_size,'bytes;',len(z.namelist()),'files')\n`;
const result=spawnSync('python3',['-c',script,staging,join(root,'docs','downloads','Information_Station_Windows.zip')],{encoding:'utf8'});process.stdout.write(result.stdout);process.stderr.write(result.stderr);if(result.status!==0)process.exit(result.status||1);await rm(staging,{recursive:true,force:true});
