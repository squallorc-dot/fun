// Restore the existing bilingual eight-question decision engine as a standalone experience.
document.addEventListener('DOMContentLoaded',()=>{
 const locale=document.documentElement.lang.toLowerCase().startsWith('ja')?'ja':'zh';
 if(!document.getElementById('protocol-quiz-root'))return;
 if(!window.BioCityProtocol?.init){document.getElementById('protocol-quiz-root').textContent=locale==='ja'?'分析を読み込めませんでした。ページを再読み込みしてください。':'分析載入失敗，請重新整理頁面。';return;}
 window.BioCityProtocol.init(locale);
});
