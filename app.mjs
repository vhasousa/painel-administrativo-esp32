import {validate,progress,rate,fresh} from './model.mjs';
const $=id=>document.getElementById(id),cfg=window.PANEL_CONFIG;
const demo=new URLSearchParams(location.search).get('demo')==='1';
let goal=cfg.defaultGoal;
try{const saved=Number(localStorage.getItem('senai-goal'));if(saved>0&&Number.isInteger(saved))goal=saved;}catch{}
let broker=false,online=false,confirmed=false,lastLive=null,lastData=null,lastWall=null;
let points=[],rates=[],rows=[],events=[],client=null;
const fmt=(n,d=0)=>n.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
$('goalInput').value=goal;$('goalLabel').textContent=fmt(goal);
$('demoBanner').hidden=!demo;
$('brokerInfo').textContent=cfg.brokerUrl+' · Tópico: '+cfg.topic;
function log(message,count='—'){
 events.unshift({time:new Date().toLocaleTimeString('pt-BR'),message,count});events=events.slice(0,8);
 $('events').replaceChildren(...events.map(e=>{const tr=document.createElement('tr');for(const v of [e.time,e.message,e.count]){const td=document.createElement('td');td.textContent=typeof v==='number'?fmt(v):v;tr.append(td);}return tr;}));
}
function updateGoal(){const pct=lastData?progress(lastData.count,goal):null;$('goalLabel').textContent=fmt(goal);$('goalCount').textContent=lastData?fmt(lastData.count):'—';$('percent').textContent=pct===null?'—':fmt(pct,1)+'%';$('gaugeArc').setAttribute('stroke-dasharray',`${pct??0} 100`);}
function live(){return demo||fresh(Date.now(),lastLive,online,confirmed,cfg.staleMs)&&broker;}
function health(){
 $('clock').textContent=new Date().toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'medium'});
 const ok=live();let label=demo?'Demonstração':!broker?'Broker desconectado':ok?'● ESP32 conectado':confirmed?'ESP32 sem sinal':'Aguardando ESP32';
 $('connection').className='badge'+(ok?' live':broker?'':' off');$('connection').textContent=label;
 if(!ok){$('irStatus').textContent='Estado indisponível';$('irDot').className='status-dot';$('belt').className='conveyor';$('beam').className='beam';$('rate').textContent='—';}
 const warn=!ok?'Sem telemetria ao vivo. '+(lastData?'Os valores exibidos são da última mensagem recebida.':'Aguardando o ESP32 publicar neste tópico.'):(lastData&&!lastData.dht_ok?'Falha no DHT11. A contagem continua ativa.':'');
 $('warning').hidden=!warn;$('warning').textContent=warn;
 $('footerStatus').textContent=lastWall?'Última recepção: '+lastWall.toLocaleTimeString('pt-BR')+(ok?'':' · dados sem confirmação atual'):'Sem dados do dispositivo';
}
function draw(){
 for(const [id,key] of [['tempLine','temperature'],['humLine','humidity']]){let path='',active=false;points.forEach((p,i)=>{if(!p.dht_ok){active=false;return;}const x=35+i*955/Math.max(1,points.length-1),y=145-p[key]*1.3;path+=(active?' L':' M')+x+','+y;active=true;});$(id).setAttribute('d',path);}
 $('chartHint').textContent=points.length+' amostras recebidas nesta aba';
}
function receive(raw,retained=false){
 let d;try{d=validate(raw);}catch{log('Mensagem inválida ignorada');return;}
 const reboot=lastData&&d.boot!==lastData.boot;
 if(!reboot&&lastData&&d.seq<=lastData.seq)return;
 if(reboot){points=[];rates=[];confirmed=false;lastLive=null;log('ESP32 reiniciado · nova sessão',d.count);}
 if(!retained){lastLive=Date.now();confirmed=true;online=true;}
 const previous=lastData;lastData=d;lastWall=new Date();
 $('count').textContent=fmt(d.count);$('temperature').textContent=d.dht_ok?fmt(d.temperature,1):'—';$('humidity').textContent=d.dht_ok?fmt(d.humidity,1):'—';
 if(live()){$('irStatus').textContent=d.detected?'Objeto detectado':'Campo livre';$('irDot').className='status-dot '+(d.detected?'detected':'live');$('belt').className='conveyor'+(d.detected?' detected':'');$('beam').className='beam'+(d.detected?' detected':'');}
 $('lastMessage').textContent=lastWall.toLocaleTimeString('pt-BR')+(retained?' · retida':'');
 if(!previous)log(retained?'Último registro recuperado · aguardando mensagem ao vivo':'Primeira telemetria recebida',d.count);
 else if(!reboot&&d.count>previous.count)log('Passagem registrada · +'+(d.count-previous.count)+' peça(s)',d.count);
 if(!retained){rates.push(d);rates=rates.filter(p=>p.uptime_ms>=d.uptime_ms-60000);const r=rate(rates);$('rate').textContent=r===null?'—':fmt(r,1);points.push(d);points=points.slice(-60);rows.push([lastWall.toISOString(),d.boot,d.seq,d.count,d.dht_ok?d.temperature:'',d.dht_ok?d.humidity:'',d.detected?1:0]);if(rows.length>10000)rows.shift();draw();}
 updateGoal();health();
}
$('goalForm').onsubmit=e=>{e.preventDefault();const value=Number($('goalInput').value);if(!Number.isInteger(value)||value<1||value>10000000)return;goal=value;try{localStorage.setItem('senai-goal',String(goal));}catch{}updateGoal();log('Meta ajustada para '+fmt(goal)+' peças',lastData?.count??'—');};
$('export').onclick=()=>{if(!rows.length){log('Sem leituras ao vivo para exportar');return;}const csv='\uFEFF'+['recebido_em_iso;sessao;sequencia;pecas;temperatura_c;umidade_pct;detectado',...rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';'))].join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=(demo?'demo-':'')+'senai-producao.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
if(demo){
 let seq=0,count=126;broker=online=true;
 const tick=()=>{seq++;if(seq%3===0)count++;receive({boot:'demo',seq,count,uptime_ms:seq*2000,detected:seq%3===0,dht_ok:true,temperature:25.6+Math.sin(seq/7)*.7,humidity:61+Math.sin(seq/11)*3});};tick();setInterval(tick,2000);
}else if(!window.mqtt){log('Biblioteca MQTT ausente: execute npm install e npm run build');health();}
else{
 client=window.mqtt.connect(cfg.brokerUrl,{clientId:'senai-web-'+crypto.randomUUID().slice(0,12),clean:true,protocolVersion:4,reconnectPeriod:3000,connectTimeout:10000,keepalive:30});
 client.on('connect',()=>{broker=true;confirmed=false;lastLive=null;client.subscribe([cfg.topic,cfg.statusTopic],{qos:0},(error,granted)=>{if(error||granted?.some(g=>g.qos===128))log('Falha ao assinar tópico MQTT');});health();});
 client.on('message',(topic,payload,packet)=>{try{if(topic===cfg.topic)receive(JSON.parse(payload.toString()),packet.retain);else if(topic===cfg.statusTopic){if(payload.toString()==='offline'){online=false;confirmed=false;}else if(payload.toString()==='online')online=true;health();}}catch{log('Conteúdo MQTT inválido ignorado');}});
 const disconnect=()=>{broker=false;confirmed=false;online=false;health();};client.on('offline',disconnect);client.on('close',disconnect);client.on('error',()=>{health();});
}
updateGoal();health();setInterval(health,1000);
