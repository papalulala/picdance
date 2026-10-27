// A deterministic, smooth wandering route within the open plaza.
// Uses server age so reconnecting visitors see the same position.
export function dancerMotion(sequence, age, beat=0) {
 const seed=(Math.sin(sequence*127.1+311.7)*43758.5453)%1;
 const phase=Math.abs(seed)*Math.PI*2;
 const direction=sequence%2?1:-1;
 const angle=phase+age*(.14+Math.abs(seed)*.08)*direction+.45*Math.sin(age*.35+phase);
 const radius=2.4+1.2*Math.sin(age*.23+phase)+.45*Math.sin(age*.61+phase*2);
 return {x:Math.cos(angle)*radius,z:2+Math.sin(angle)*radius,y:.86+Math.abs(Math.sin(age*4+phase))*(.14+beat*.5),roll:Math.sin(age*3+phase)*(.08+beat*.16),waveTime:age*4.2+phase,waveStrength:.12+beat*.17};
}
