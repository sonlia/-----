'use client';
import { useEffect, useRef } from 'react';

interface ChargingPanelProps { kpiPower: string; }

function setupHiDPI(canvas: HTMLCanvasElement, w: number, h: number) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = '100%'; canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d')!; ctx.scale(dpr, dpr);
  return ctx;
}

export default function ChargingPanel({ kpiPower }: ChargingPanelProps) {
  const barRef = useRef<HTMLCanvasElement>(null);
  const usageRef = useRef<HTMLCanvasElement>(null);
  const ps = { position: 'relative' as const, padding: '14px 16px' };

  // 月度充电量柱状图
  useEffect(() => {
    const c = barRef.current; if (!c) return;
    const W=280,H=130,ctx=setupHiDPI(c,W,H); ctx.clearRect(0,0,W,H);
    const ms=['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月'];
    const d=ms.map((_,i)=>2800+Math.sin(i/2)*600+Math.random()*300);
    const mx=Math.max(...d)*1.2, bw=W/11*0.6;
    ctx.strokeStyle='rgba(0,212,255,0.06)';
    for(let i=0;i<=3;i++){ctx.beginPath();ctx.moveTo(0,H/3*i);ctx.lineTo(W,H/3*i);ctx.stroke();}
    d.forEach((v,i)=>{const x=i*(W/11)+(W/11-bw)/2,h=v/mx*(H-20);
      const g=ctx.createLinearGradient(0,H-15-h,0,H-15);g.addColorStop(0,'#00d4ff');g.addColorStop(1,'rgba(0,212,255,0.1)');
      ctx.fillStyle=g;ctx.shadowColor='#00d4ff';ctx.shadowBlur=3;ctx.fillRect(x,H-15-h,bw,h);ctx.shadowBlur=0;
      ctx.fillStyle='#8aa5c4';ctx.font='8px Rajdhani';ctx.textAlign='center';ctx.fillText(ms[i],x+bw/2,H-4);});
  }, []);

  // 月度使用率柱状图
  useEffect(() => {
    const c = usageRef.current; if (!c) return;
    const W=280,H=130,ctx=setupHiDPI(c,W,H); ctx.clearRect(0,0,W,H);
    const ms=['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月'];
    const d=ms.map((_,i)=>45+Math.sin(i/3)*12+Math.random()*8);
    const bw=W/11*0.6;
    ctx.strokeStyle='rgba(0,212,255,0.06)';
    for(let i=0;i<=3;i++){ctx.beginPath();ctx.moveTo(0,H/3*i);ctx.lineTo(W,H/3*i);ctx.stroke();}
    d.forEach((v,i)=>{const x=i*(W/11)+(W/11-bw)/2,h=v/100*(H-20);
      const g=ctx.createLinearGradient(0,H-15-h,0,H-15);g.addColorStop(0,'#00ff88');g.addColorStop(1,'rgba(0,255,136,0.1)');
      ctx.fillStyle=g;ctx.shadowColor='#00ff88';ctx.shadowBlur=3;ctx.fillRect(x,H-15-h,bw,h);ctx.shadowBlur=0;
      ctx.fillStyle='#00ff88';ctx.font='bold 8px Orbitron';ctx.textAlign='center';ctx.fillText(v.toFixed(0)+'%',x+bw/2,H-18-h);
      ctx.fillStyle='#8aa5c4';ctx.font='8px Rajdhani';ctx.fillText(ms[i],x+bw/2,H-4);});
  }, []);

  return (
    <div style={{ position:'absolute',top:'120px',left:'20px',right:'20px',bottom:'20px',display:'flex',flexDirection:'column',gap:'10px',zIndex:40,overflow:'hidden' }}>
      {/* KPI */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',gap:'10px' }}>
        {[
          {l:'充电桩总数',v:'1,459',u:'个',c:'#00d4ff',i:'🔌'},
          {l:'日充电量',v:'4,283',u:'kWh',c:'#00ffcc',i:'⚡'},
          {l:'日订单数',v:'326',u:'单',c:'#ffcc44',i:'📋'},
          {l:'充电桩利用率',v:'66.7',u:'%',c:'#00ff88',i:'📊'},
          {l:'场站总数',v:'48',u:'站',c:'#ff8844',i:'🏭'},
        ].map((k,i)=>(
          <div key={i} className="panel" style={{...ps}}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{fontSize:'12px',color:'var(--text-dim)',marginBottom:'6px',display:'flex',alignItems:'center',gap:'6px'}}><span style={{fontSize:'16px'}}>{k.i}</span>{k.l}</div>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:'28px',fontWeight:700,color:k.c,textShadow:`0 0 12px ${k.c}40`}}>{k.v}<span style={{fontSize:'12px',color:'var(--text-dim)',marginLeft:'4px'}}>{k.u}</span></div>
          </div>
        ))}
      </div>
      {/* 三栏 */}
      <div style={{flex:1,display:'grid',gridTemplateColumns:'1fr 1.2fr 1fr',gap:'10px',minHeight:0}}>
        {/* 左侧 */}
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          <div className="panel" style={{...ps}}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{fontSize:'13px',color:'var(--primary)',fontWeight:600,marginBottom:'10px',letterSpacing:'1px'}}>场站信息</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px'}}>
              <div style={{textAlign:'center',padding:'8px',background:'rgba(0,212,255,0.06)',borderRadius:'4px'}}><div style={{fontSize:'10px',color:'var(--text-dim)'}}>站点总数</div><div style={{fontFamily:'Orbitron,monospace',fontSize:'18px',color:'var(--primary)',fontWeight:700}}>48</div></div>
              <div style={{textAlign:'center',padding:'8px',background:'rgba(0,255,136,0.06)',borderRadius:'4px'}}><div style={{fontSize:'10px',color:'var(--text-dim)'}}>启用</div><div style={{fontFamily:'Orbitron,monospace',fontSize:'18px',color:'var(--success)',fontWeight:700}}>42</div></div>
              <div style={{textAlign:'center',padding:'8px',background:'rgba(255,77,109,0.06)',borderRadius:'4px'}}><div style={{fontSize:'10px',color:'var(--text-dim)'}}>禁用</div><div style={{fontFamily:'Orbitron,monospace',fontSize:'18px',color:'var(--danger)',fontWeight:700}}>6</div></div>
            </div>
          </div>
          <div className="panel" style={{...ps,flex:1,display:'flex',flexDirection:'column'}}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{fontSize:'13px',color:'var(--primary)',fontWeight:600,marginBottom:'10px',letterSpacing:'1px'}}>实时异常监控</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px',marginBottom:'8px'}}>
              <div style={{padding:'6px 8px',background:'rgba(255,170,68,0.06)',borderRadius:'4px',borderLeft:'2px solid var(--warn)'}}><div style={{fontSize:'9px',color:'var(--text-dim)'}}>掉线桩</div><div style={{fontFamily:'Orbitron,monospace',fontSize:'14px',color:'var(--warn)',fontWeight:600}}>12</div></div>
              <div style={{padding:'6px 8px',background:'rgba(255,77,109,0.06)',borderRadius:'4px',borderLeft:'2px solid var(--danger)'}}><div style={{fontSize:'9px',color:'var(--text-dim)'}}>故障桩</div><div style={{fontFamily:'Orbitron,monospace',fontSize:'14px',color:'var(--danger)',fontWeight:600}}>5</div></div>
            </div>
            <div style={{flex:1,overflowY:'auto',fontSize:'10px'}}>
              {[
                {t:'14:32',m:'CP-038 通信超时，自动重连',c:'#ffaa44'},
                {t:'14:28',m:'CP-127 急停按钮触发',c:'#ff4d6d'},
                {t:'14:15',m:'CP-006 充电完成，结算正常',c:'#8aa5c4'},
                {t:'14:08',m:'CP-091 温度预警 68°C',c:'#ffaa44'},
                {t:'13:55',m:'CP-223 恢复在线',c:'#8aa5c4'},
                {t:'13:42',m:'CP-015 CC2连接异常',c:'#ff4d6d'},
              ].map((a,i)=>(
                <div key={i} style={{display:'flex',gap:'8px',padding:'3px 0',borderBottom:'1px solid rgba(0,212,255,0.05)'}}>
                  <span style={{color:'var(--text-dim)',fontFamily:'Orbitron,monospace',flexShrink:0}}>{a.t}</span>
                  <span style={{color:a.c}}>{a.m}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="panel" style={{...ps}}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{fontSize:'13px',color:'var(--primary)',fontWeight:600,marginBottom:'8px',letterSpacing:'1px'}}>月度充电量趋势 (kWh)</div>
            <canvas ref={barRef} width={280} height={130} style={{width:'100%',height:'130px'}}></canvas>
          </div>
        </div>
        {/* 中间 */}
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          <div className="panel" style={{...ps,flex:1}}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
              <span style={{fontSize:'13px',color:'var(--primary)',fontWeight:600,letterSpacing:'1px'}}>站点分布</span>
              <div style={{display:'flex',gap:'10px',fontSize:'10px'}}>
                <span style={{display:'flex',alignItems:'center',gap:'4px'}}><span style={{width:'8px',height:'8px',borderRadius:'50%',background:'var(--success)'}}></span>充电中</span>
                <span style={{display:'flex',alignItems:'center',gap:'4px'}}><span style={{width:'8px',height:'8px',borderRadius:'50%',background:'var(--primary)'}}></span>闲置</span>
                <span style={{display:'flex',alignItems:'center',gap:'4px'}}><span style={{width:'8px',height:'8px',borderRadius:'50%',background:'var(--danger)'}}></span>异常</span>
                <span style={{display:'flex',alignItems:'center',gap:'4px'}}><span style={{width:'8px',height:'8px',borderRadius:'50%',background:'var(--text-dim)'}}></span>未启用</span>
              </div>
            </div>
            {/* 深圳SVG地图 */}
            <div style={{position:'relative',width:'100%',height:'100%',minHeight:'200px',borderRadius:'6px',overflow:'hidden',border:'1px solid var(--border-line)',background:'radial-gradient(ellipse at center, rgba(0,30,60,0.6) 0%, rgba(2,7,15,0.9) 70%)'}}>
              <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(0,212,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.05) 1px, transparent 1px)',backgroundSize:'25px 25px'}}></div>
              <svg style={{position:'absolute',inset:0,width:'100%',height:'100%'}} viewBox="0 0 400 250" preserveAspectRatio="xMidYMid meet">
                <path d="M 0,0 L 400,0 L 400,250 L 0,250 Z" fill="rgba(0,20,40,0.3)" />
                <path d="M 60,180 L 80,150 L 100,140 L 120,120 L 140,110 L 160,90 L 180,80 L 200,70 L 230,65 L 260,60 L 290,55 L 320,50 L 350,45 L 370,40 L 380,60 L 375,90 L 360,110 L 340,130 L 320,145 L 300,155 L 280,165 L 260,175 L 240,185 L 220,195 L 200,205 L 180,210 L 160,215 L 140,218 L 120,220 L 100,218 L 80,210 L 60,200 Z" fill="rgba(0,40,80,0.3)" stroke="rgba(0,212,255,0.3)" strokeWidth="1.5" />
                {/* 各区区域 */}
                <path d="M 60,180 L 80,150 L 100,140 L 120,120 L 120,220 L 100,218 L 80,210 L 60,200 Z" fill="rgba(0,136,255,0.06)" stroke="rgba(0,136,255,0.2)" strokeWidth="0.8" />
                <path d="M 120,120 L 140,110 L 160,90 L 160,215 L 140,218 L 120,220 Z" fill="rgba(0,212,255,0.06)" stroke="rgba(0,212,255,0.2)" strokeWidth="0.8" />
                <path d="M 160,90 L 180,80 L 200,70 L 200,205 L 180,210 L 160,215 Z" fill="rgba(0,255,204,0.06)" stroke="rgba(0,255,204,0.2)" strokeWidth="0.8" />
                <path d="M 200,70 L 230,65 L 230,195 L 200,205 Z" fill="rgba(255,204,68,0.06)" stroke="rgba(255,204,68,0.2)" strokeWidth="0.8" />
                <path d="M 230,65 L 250,62 L 250,190 L 230,195 Z" fill="rgba(0,255,136,0.06)" stroke="rgba(0,255,136,0.2)" strokeWidth="0.8" />
                <path d="M 250,62 L 270,58 L 270,180 L 250,190 Z" fill="rgba(0,212,255,0.06)" stroke="rgba(0,212,255,0.2)" strokeWidth="0.8" />
                <path d="M 270,58 L 290,55 L 290,160 L 270,180 Z" fill="rgba(255,136,68,0.06)" stroke="rgba(255,136,68,0.2)" strokeWidth="0.8" />
                <path d="M 290,55 L 320,50 L 330,140 L 300,155 L 290,160 Z" fill="rgba(0,136,255,0.06)" stroke="rgba(0,136,255,0.2)" strokeWidth="0.8" />
                <path d="M 320,50 L 350,45 L 360,110 L 340,130 L 330,140 Z" fill="rgba(0,255,204,0.06)" stroke="rgba(0,255,204,0.2)" strokeWidth="0.8" />
                <path d="M 350,45 L 370,40 L 380,60 L 375,90 L 360,110 Z" fill="rgba(255,204,68,0.06)" stroke="rgba(255,204,68,0.2)" strokeWidth="0.8" />
                {/* 标签 */}
                {[['85','175','宝安'],['130','165','光明'],['175','145','南山'],['205','130','龙华'],['232','125','福田'],['253','120','罗湖'],['275','100','盐田'],['300','100','龙岗'],['335','85','坪山'],['365','75','大鹏']].map((t,i)=>(
                  <text key={i} x={t[0]} y={t[1]} fill="rgba(138,165,196,0.6)" fontSize="9" fontFamily="Rajdhani" fontWeight="600">{t[2]}</text>
                ))}
                <text x="20" y="100" fill="rgba(0,100,150,0.5)" fontSize="10" fontFamily="Rajdhani">珠江口</text>
                <text x="340" y="220" fill="rgba(0,100,150,0.5)" fontSize="10" fontFamily="Rajdhani">大鹏湾</text>
              </svg>
              {/* 站点光柱 */}
              {[
                {x:'50%',y:'38%',s:'charging',n:'南山站'},{x:'56%',y:'48%',s:'idle',n:'福田站'},
                {x:'64%',y:'40%',s:'charging',n:'罗湖站'},{x:'25%',y:'68%',s:'error',n:'宝安站'},
                {x:'47%',y:'56%',s:'charging',n:'龙华站'},{x:'37%',y:'64%',s:'idle',n:'光明站'},
                {x:'78%',y:'38%',s:'disabled',n:'龙岗站'},{x:'87%',y:'32%',s:'charging',n:'坪山站'},
                {x:'71%',y:'30%',s:'idle',n:'盐田站'},{x:'93%',y:'48%',s:'charging',n:'大鹏站'},
              ].map((p,i)=>{
                const cs:any={charging:'#00ff88',idle:'#00d4ff',error:'#ff4d6d',disabled:'#4a6485'};
                return (
                  <div key={i} style={{position:'absolute',left:p.x,top:p.y,transform:'translate(-50%, -50%)',display:'flex',flexDirection:'column',alignItems:'center'}}>
                    <div style={{width:'10px',height:'10px',borderRadius:'50%',background:cs[p.s],boxShadow:`0 0 12px ${cs[p.s]}`,animation:'pulse 2s infinite'}}></div>
                    <div style={{width:'2px',height:'18px',background:`linear-gradient(180deg, ${cs[p.s]}, transparent)`,marginTop:'-2px'}}></div>
                    <div style={{fontSize:'9px',color:'#e8f4ff',marginTop:'2px',whiteSpace:'nowrap',textShadow:'0 0 6px rgba(0,0,0,0.9)',fontWeight:600}}>{p.n}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="panel" style={{...ps}}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{fontSize:'13px',color:'var(--primary)',fontWeight:600,marginBottom:'10px',letterSpacing:'1px'}}>充电桩实时状态</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(8, 1fr)',gap:'6px'}}>
              {Array.from({length:24}).map((_,i)=>{
                const sts=['charging','charging','charging','charging','charging','idle','idle','error'];
                const st=sts[i%sts.length];
                const cs:any={charging:{bg:'rgba(0,255,136,0.1)',bd:'#00ff88',tx:'#00ff88'},idle:{bg:'rgba(0,212,255,0.06)',bd:'#00d4ff',tx:'#00d4ff'},error:{bg:'rgba(255,77,109,0.08)',bd:'#ff4d6d',tx:'#ff4d6d'}};
                const c=cs[st];const pw=st==='charging'?(3.5+Math.random()*4):0;
                return (
                  <div key={i} style={{padding:'6px 4px',background:c.bg,border:`1px solid ${c.bd}`,borderRadius:'4px',textAlign:'center'}}>
                    <div style={{fontSize:'9px',color:'var(--text-main)',fontWeight:600}}>CP-{String(i+1).padStart(3,'0')}</div>
                    <div style={{fontSize:'8px',color:c.tx,marginTop:'2px'}}>{st==='charging'?pw.toFixed(1)+'kW':st==='idle'?'空闲':'故障'}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {/* 右侧 */}
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          <div className="panel" style={{...ps}}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{fontSize:'13px',color:'var(--warn)',fontWeight:600,marginBottom:'10px',letterSpacing:'1px'}}>💰 今日运营数据</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px'}}>
              {[
                {l:'订单数',v:'326',u:'单',c:'var(--primary)'},
                {l:'充电量',v:'4,283',u:'kWh',c:'var(--cyan-glow)'},
                {l:'服务费',v:'2,056',u:'元',c:'var(--warn)'},
                {l:'电费',v:'2,933',u:'元',c:'var(--success)'},
              ].map((d,i)=>(
                <div key={i} style={{padding:'8px',background:`${d.c}0d`,borderRadius:'4px',borderLeft:`2px solid ${d.c}`}}>
                  <div style={{fontSize:'10px',color:'var(--text-dim)'}}>{d.l}</div>
                  <div style={{fontFamily:'Orbitron,monospace',fontSize:'16px',fontWeight:700,color:d.c}}>{d.v}<span style={{fontSize:'9px',color:'var(--text-dim)',marginLeft:'2px'}}>{d.u}</span></div>
                </div>
              ))}
            </div>
            <div style={{marginTop:'8px',padding:'8px',background:'rgba(255,204,68,0.08)',borderRadius:'4px',textAlign:'center'}}>
              <div style={{fontSize:'10px',color:'var(--text-dim)'}}>今日总收益</div>
              <div style={{fontFamily:'Orbitron,monospace',fontSize:'24px',fontWeight:700,color:'var(--warn)',textShadow:'0 0 12px rgba(255,204,68,0.4)'}}>4,989<span style={{fontSize:'12px',color:'var(--text-dim)',marginLeft:'4px'}}>元</span></div>
            </div>
          </div>
          <div className="panel" style={{...ps}}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{fontSize:'13px',color:'var(--cyan-glow)',fontWeight:600,marginBottom:'10px',letterSpacing:'1px'}}>📈 累计运营</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px'}}>
              {[
                {l:'累计收益',v:'186.5',u:'万元',c:'#00d4ff'},
                {l:'累计充电量',v:'152.8',u:'万kWh',c:'#00ffcc'},
                {l:'累计订单',v:'12.6',u:'万单',c:'#00ff88'},
                {l:'服务用户',v:'8,432',u:'人',c:'#ff8844'},
              ].map((d,i)=>(
                <div key={i} style={{padding:'8px',background:`${d.c}0d`,borderRadius:'4px'}}>
                  <div style={{fontSize:'10px',color:'var(--text-dim)'}}>{d.l}</div>
                  <div style={{fontFamily:'Orbitron,monospace',fontSize:'16px',color:d.c,fontWeight:700}}>{d.v}<span style={{fontSize:'9px',color:'var(--text-dim)',marginLeft:'2px'}}>{d.u}</span></div>
                </div>
              ))}
            </div>
          </div>
          <div className="panel" style={{...ps,flex:1}}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{fontSize:'13px',color:'var(--primary)',fontWeight:600,marginBottom:'8px',letterSpacing:'1px'}}>月度使用率趋势 (%)</div>
            <canvas ref={usageRef} width={280} height={130} style={{width:'100%',height:'130px'}}></canvas>
          </div>
        </div>
      </div>
    </div>
  );
}
