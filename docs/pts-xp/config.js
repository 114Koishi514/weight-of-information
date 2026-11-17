'use strict';
globalThis.PTS = {
  config: {
    BLOCK_CAPACITY: 1193,
    IN_UNIVERSE_DATE_MODE: '2002',  // '2002' or 'local'
    DEMO_CLOCK_START: '2002-10-07T09:41:00Z',
    RECEPTION_PIN: '114514',
    // Sender and subject are envelope fields. Only the English body uses the PTS-78 codebook.
    INCOMING: [
      {
        id:"01", title:"01", sender:"Kit",
        subject:"Tea?", material:"SOFT",
        message:"Kettle's on. Two sugars?"
      },
      {
        id:"02", title:"02", sender:"Nina",
        subject:"Your spare key", material:"SOFT",
        message:"I've left your spare key with the woman at the corner shop. She shuts at six. Get a pint of milk on your way back?"
      },
      {
        id:"03", title:"03", sender:"U*L",
        subject:"Thursday studio access", material:"SOFT",
        message:"The print room will open at ten on Thursday while the sinks are being repaired. Students booked into the nine o'clock session can use Studio B. Bring your test sheets. If your name is missing from the booking list, take your numbered receipt to the school office and we will find you a place."
      },
      {
        id:"04", title:"04", sender:"Public Transmission Service",
        subject:"At the collection counter", material:"HARD",
        message:"Several holders have brought the same number to the collection counter this week. If this happens to you, let the clerk see your slip before either copy leaves the desk. We will put the two blocks side by side and mark which part of the register each came from. Please leave a telephone number only if you wish to be called. Otherwise, keep the slip and ask for the same number on your next visit. The space occupied by both blocks will remain on the station inventory until the entries have been checked. No second collection fee is due."
      },
      {
        id:"05", title:"05", sender:"H* goverment",
        subject:"Allocation of public storage", material:"HARD",
        message:"From 1 November, every public transmission office will keep one shelf for residents who have no permanent place to store a registered message. Ask at the counter for a space. The clerk will give you a numbered ticket and enter the location of the block in the district book. A person staying at a hostel, in temporary lodgings or with relatives may use the same shelf as a householder. Space will be measured by the number of blocks on the shelf. A short note and a letter may each require one space. A longer statement may occupy two or more. Staff must give the holder the numbers in order and keep the whole set together. Where the local shelf is full, the office will enter the address of the nearest store on the ticket. The holder may leave the blocks at the counter for the next collection van. District returns have so far counted a transfer to another store as a collection. This has allowed a shelf to appear empty in the weekly figures while its former contents are still waiting in a van or at a second counter. From this month the return must name both offices. The entry may be closed only when the holder signs for the complete set. If a ticket is lost, ask for a manual search. Until that search is finished, the cost of keeping the blocks will be entered against the office that last signed for them."
      }
    ],
    SINGLE_CLICK: false,           // Touch and pen activate on one tap.
    SCANLINES: false,
    GLOW: false,
    CURVATURE: true,
    FLICKER: false,
    RECEIPT_DOTS: 384,
    PRINTABLE_MM: 48,
    PAPER_MM: 57,
    ASSETS: {
      boot: null,
      wallpaper: 'assets/desktop/wallpaper.png',
      icons: Object.fromEntries(['transmission','reception','computer','guide','record'].map(id => [id, 'assets/desktop/'+id+'.png'])),
      encoding: null               // { src: 'assets/user-animation/encoding/film.webm', type: 'video' }
    }
  }
};
