import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validate,progress,rate,fresh} from '../model.mjs';
const d={boot:'ab12',seq:1,count:10,uptime_ms:1000,detected:false,dht_ok:true,temperature:25,humidity:60};
test('rejeita telemetria malformada e leituras ambientais invalidas',()=>{assert.equal(validate(d),d);assert.throws(()=>validate({...d,count:-1}));assert.throws(()=>validate({...d,humidity:120}));assert.throws(()=>validate({...d,detected:'false'}));assert.doesNotThrow(()=>validate({...d,dht_ok:false,temperature:null,humidity:null}));});
test('meta fica limitada a 100 por cento',()=>{assert.equal(progress(250,200),100);assert.equal(progress(50,200),25);});
test('ritmo usa tempo do dispositivo e nao mistura reinicios',()=>{assert.equal(rate([d,{...d,uptime_ms:61000,count:20}]),10);assert.equal(rate([d,{...d,boot:'outro',uptime_ms:61000,count:20}]),null);assert.equal(rate([d]),null);});
test('retida nao comprova conexao e leituras antigas expiram',()=>{assert.equal(fresh(5000,4000,true,false,12000),false);assert.equal(fresh(5000,4000,true,true,12000),true);assert.equal(fresh(20000,4000,true,true,12000),false);assert.equal(fresh(5000,4000,false,true,12000),false);});
