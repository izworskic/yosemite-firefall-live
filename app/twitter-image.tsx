import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Yosemite Firefall Live — Horsetail Fall forecast';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', overflow: 'hidden', background: 'linear-gradient(115deg,#173c2d 0%,#385b5c 45%,#d77b49 80%,#f0ad45 100%)', color: 'white', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ position:'absolute', right:-80, top:35, width:650, height:650, background:'#4f5a53', clipPath:'polygon(28% 0,100% 12%,92% 100%,5% 100%,0 45%)', opacity:.88 }}/>
      <div style={{ position:'absolute', right:350, top:150, width:7, height:330, background:'linear-gradient(#fff5c9,#ff963d,#ef5524)', boxShadow:'0 0 28px 8px rgba(255,136,47,.55)' }}/>
      <div style={{ position:'relative', display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'70px', width:'780px' }}>
        <div style={{ fontSize:22, letterSpacing:5, fontWeight:700 }}>YOSEMITE FIREFALL LIVE</div>
        <div style={{ fontSize:84, fontWeight:800, lineHeight:.96, marginTop:18 }}>Will Horsetail Fall glow?</div>
        <div style={{ fontSize:30, marginTop:28, opacity:.9 }}>Probability · peak timing · water · western sky</div>
      </div>
    </div>,
    size
  );
}
