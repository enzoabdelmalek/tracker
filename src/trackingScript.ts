// This is the client-side tracking script served as track.js
// It auto-detects the collect endpoint from its own src URL
export const TRACKING_SCRIPT = `(function(){
  var s=document.currentScript||document.querySelector('script[src*="track.js"]');
  if(!s)return;
  var src=s.getAttribute('src')||'';
  var u=new URL(src,location.href);
  var bid=u.searchParams.get('id');
  if(!bid)return;
  var collectUrl=u.origin+'/collect';

  if(navigator.doNotTrack==='1')return;

  var vid=localStorage.getItem('_vwa_vid');
  if(!vid){vid=Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem('_vwa_vid',vid);}
  var sid=sessionStorage.getItem('_vwa_sid');
  if(!sid){sid=Math.random().toString(36).slice(2)+Date.now().toString(36);sessionStorage.setItem('_vwa_sid',sid);}

  var durationUrl=u.origin+'/duration';
  var startTime=Date.now();
  var totalDuration=parseInt(sessionStorage.getItem('_vwa_dur')||'0',10);

  function send(){
    var d={business_id:bid,url:location.href,referrer:document.referrer||null,visitor_id:vid,session_id:sid,screen_width:screen.width};
    var b=new Blob([JSON.stringify(d)],{type:'text/plain'});
    if(navigator.sendBeacon){navigator.sendBeacon(collectUrl,b);}
    else{fetch(collectUrl,{method:'POST',body:JSON.stringify(d),headers:{'Content-Type':'application/json'},keepalive:true});}
  }

  function sendDuration(){
    var dur=Math.round((Date.now()-startTime)/1000);
    if(dur<1)return;
    totalDuration+=dur;
    sessionStorage.setItem('_vwa_dur',String(totalDuration));
    var d={session_id:sid,duration_seconds:totalDuration};
    var b=new Blob([JSON.stringify(d)],{type:'text/plain'});
    if(navigator.sendBeacon){navigator.sendBeacon(durationUrl,b);}
    else{fetch(durationUrl,{method:'POST',body:JSON.stringify(d),headers:{'Content-Type':'application/json'},keepalive:true});}
  }

  document.addEventListener('visibilitychange',function(){
    if(document.hidden){sendDuration();startTime=Date.now();}
    else{startTime=Date.now();}
  });

  if(document.readyState==='complete'){send();}else{window.addEventListener('load',send);}

  var pp=history.pushState;
  history.pushState=function(){sendDuration();pp.apply(this,arguments);startTime=Date.now();send();};
  window.addEventListener('popstate',function(){sendDuration();startTime=Date.now();send();});
})();`;
