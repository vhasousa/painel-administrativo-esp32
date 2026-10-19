export function validate(d){
  if(!d||typeof d.boot!=='string'||!d.boot.length||d.boot.length>80||!Number.isSafeInteger(d.seq)||d.seq<0||!Number.isSafeInteger(d.count)||d.count<0||typeof d.detected!=='boolean'||typeof d.dht_ok!=='boolean'||!Number.isFinite(d.uptime_ms)||d.uptime_ms<0)throw Error('Mensagem invalida');
  if(d.dht_ok&&(!Number.isFinite(d.temperature)||d.temperature< -40||d.temperature>100||!Number.isFinite(d.humidity)||d.humidity<0||d.humidity>100))throw Error('Leitura DHT invalida');
  return d;
}
export function progress(count,goal){return goal>0?Math.min(100,Math.max(0,count/goal*100)):0;}
export function rate(samples){if(samples.length<2)return null;const a=samples[0],b=samples.at(-1);const minutes=(b.uptime_ms-a.uptime_ms)/60000;if(minutes<=0||a.boot!==b.boot||b.count<a.count)return null;return (b.count-a.count)/minutes;}
export function fresh(now,last,online,confirmed,limit){return online&&confirmed&&last!==null&&now-last<=limit;}
