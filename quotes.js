/* =====================================================================
   عروض الأسعار — شركة أجري تايم
   ===================================================================== */
const COMPANY_NAME = 'شركة أجري تايم';
let QE = null;          // العرض اللي بيتعدل دلوقتي
let qeDirty = false;
const ROWS_FIRST = 11, ROWS_OTHER = 13;   // عدد الصفوف في كل صفحة A4

/* ---------- تنقل ---------- */
function syncSections(){
  const inQuotes = view==='quotes', inEdit = view==='quote';
  const prod = !inQuotes && !inEdit;
  document.querySelector('.tools').classList.toggle('hidden', !prod);
  $('list').classList.toggle('hidden', !prod);
  document.querySelector('.fab').classList.toggle('hidden', !prod);
  $('quotesView').classList.toggle('hidden', !inQuotes);
  $('quoteEdit').classList.toggle('hidden', !inEdit);
}
function openQuotes(){
  view='quotes'; $('qq').value=''; syncSections(); renderQuotes(); window.scrollTo({top:0});
}
function backToQuotes(force){
  if(qeDirty && !force){
    return askConfirm('في تعديلات ما اتحفظتش — تخرج من غير حفظ؟','أيوه اخرج',()=>{ qeDirty=false; backToQuotes(true); });
  }
  QE=null; qeDirty=false; openQuotes();
}

/* ---------- لستة العروض ---------- */
function quoteTotal(q){
  return (q.items||[]).reduce((s,it)=>s + (num(it.qty)||0)*(num(it.price)||0), 0);
}
function fmtDate(d){
  if(!d) return '';
  const [y,m,dd] = String(d).slice(0,10).split('-');
  return dd && m && y ? `${dd}/${m}/${y}` : d;
}
function renderQuotes(){
  const q = norm($('qq').value);
  const arr = QUOTES.filter(x=>!q || norm(x.client+' '+x.number).includes(q))
    .sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
  let h = `<button class="cat-tile add" onclick="newQuote()"><span class="cat-ic">＋</span><span class="cat-name">عرض أسعار جديد</span></button>`;
  if(!arr.length) h += `<div class="empty">${QUOTES.length?'مفيش نتايج':'لسه مفيش عروض'}</div>`;
  h += arr.map(x=>{
    const t = quoteTotal(x);
    return `<button class="cat-tile" onclick="openQuote('${esc(x.id)}')">
      <span class="cat-ic">📄</span>
      <span class="cat-name">${esc(x.client||'بدون اسم')}
        <small class="qsub">${esc(x.number)} • ${fmtDate(x.date)} • ${(x.items||[]).length} صنف${t?` • ${money(t)} ج`:''}</small></span>
      <span class="cat-arrow">‹</span></button>`;
  }).join('');
  $('quoteList').innerHTML = `<div class="cat-list">${h}</div>`;
}

/* ---------- المحرر ---------- */
function todayStr(){ const d=new Date(); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10); }
function newQuote(){
  QE = { id:'', number:'', client:'', date:todayStr(), priceType:'wholesale', items:[], notes:'' };
  qeDirty=false; showEditor();
}
function openQuote(id){
  const q = QUOTES.find(x=>x.id===id); if(!q) return;
  QE = JSON.parse(JSON.stringify(q)); QE.date = String(QE.date||'').slice(0,10);
  qeDirty=false; showEditor();
}
function showEditor(){
  view='quote'; syncSections();
  $('qeTitle').textContent = QE.number ? `عرض ${QE.number}` : 'عرض جديد';
  $('qeClient').value = QE.client; $('qeDate').value = QE.date;
  $('qePriceType').value = QE.priceType||'wholesale'; $('qeNotes').value = QE.notes||'';
  $('qeDelete').classList.toggle('hidden', !QE.id);
  renderQEItems(); window.scrollTo({top:0});
}
function qeField(){ QE.client=$('qeClient').value; QE.date=$('qeDate').value; QE.notes=$('qeNotes').value; qeDirty=true; }
function priceOf(p, type){ return num(type==='retail' ? p.retailPrice : p.wholesalePrice); }
function applyPriceType(){
  QE.priceType = $('qePriceType').value; qeDirty=true;
  let missing=0;
  QE.items.forEach(it=>{ const p=PRODUCTS.find(x=>x.id===it.pid); if(p){ const v=priceOf(p,QE.priceType); if(v===null) missing++; else it.price=v; } });
  renderQEItems();
  toast(missing ? `اتغيرت الأسعار — ${missing} صنف ملوش سعر ${QE.priceType==='retail'?'تجاري':'جملة'} فسيبته زي ما هو` : 'اتغيرت الأسعار ✅');
}
function productOf(it){ return PRODUCTS.find(x=>x.id===it.pid) || {}; }
function qThumb(it, w){
  const p = productOf(it);
  if(p.thumb) return p.thumb;
  if(p.imageUrl) return imgSrc(p, w||200);
  return '';
}
function renderQEItems(){
  $('qeCount').textContent = QE.items.length ? `(${QE.items.length})` : '';
  if(!QE.items.length){ $('qeItems').innerHTML = `<div class="empty" style="padding:24px 0">دوس "＋ إضافة مركب" واختار المركبات</div>`; $('qeTotal').textContent=''; return; }
  $('qeItems').innerHTML = QE.items.map((it,i)=>{
    const src = qThumb(it,160);
    return `<div class="qitem">
      ${src?`<img class="qthumb" src="${esc(src)}">`:`<div class="qthumb">🧪</div>`}
      <div class="qinfo">
        <div class="cname">${esc(it.name)}</div>
        <div class="cmeta">${esc([it.unit, it.ai].filter(Boolean).join(' • '))}</div>
        <div class="qnums">
          <label>السعر<input class="inp" type="number" inputmode="decimal" value="${it.price??''}" oninput="qeSet(${i},'price',this.value)"></label>
          <label>الكمية<input class="inp" type="number" inputmode="decimal" value="${it.qty??''}" placeholder="—" oninput="qeSet(${i},'qty',this.value)"></label>
        </div>
      </div>
      <div class="qbtns">
        <button onclick="qeMove(${i},-1)" ${i===0?'disabled':''}>▲</button>
        <button onclick="qeMove(${i},1)" ${i===QE.items.length-1?'disabled':''}>▼</button>
        <button class="del" onclick="qeRemove(${i})">✕</button>
      </div>
    </div>`;
  }).join('');
  updateQETotal();
}
function qeSet(i,k,v){ QE.items[i][k] = v===''? '' : Number(v); qeDirty=true; updateQETotal(); }
function qeMove(i,d){ const j=i+d; [QE.items[i],QE.items[j]]=[QE.items[j],QE.items[i]]; qeDirty=true; renderQEItems(); }
function qeRemove(i){ QE.items.splice(i,1); qeDirty=true; renderQEItems(); }
function updateQETotal(){
  const t = quoteTotal(QE);
  $('qeTotal').textContent = t ? `الإجمالي: ${money(t)} ج.م` : '';
}

/* ---------- اختيار المركبات ---------- */
function openPicker(){ $('pkQ').value=''; renderPicker(); $('pickerModal').classList.remove('hidden'); }
function renderPicker(){
  const q = norm($('pkQ').value);
  const chosen = new Set(QE.items.map(x=>x.pid));
  const arr = PRODUCTS.filter(p=>!q || norm([p.name,p.activeIngredient,p.company,p.category].join(' ')).includes(q))
    .sort((a,b)=>String(a.name).localeCompare(String(b.name),'ar')).slice(0,200);
  $('pkCount').textContent = `${QE.items.length} مختار`;
  $('pkList').innerHTML = arr.map(p=>{
    const on = chosen.has(p.id), pr = priceOf(p, QE.priceType);
    const src = p.thumb || (p.imageUrl ? imgSrc(p,120) : '');
    return `<button class="pk ${on?'on':''}" onclick="togglePick('${esc(p.id)}')">
      ${src?`<img class="pkimg" loading="lazy" src="${esc(src)}">`:`<span class="pkimg">🧪</span>`}
      <span class="pkname">${esc(p.name)}<small>${esc([p.unit,p.category].filter(Boolean).join(' • '))}</small></span>
      <span class="pkprice">${pr===null?'—':money(pr)}</span>
      <span class="pkchk">${on?'✓':'＋'}</span></button>`;
  }).join('') || '<div class="empty">مفيش نتايج</div>';
}
function togglePick(pid){
  const i = QE.items.findIndex(x=>x.pid===pid);
  if(i>=0) QE.items.splice(i,1);
  else {
    const p = PRODUCTS.find(x=>x.id===pid);
    QE.items.push({ pid, name:p.name, unit:p.unit||'', ai:p.activeIngredient||'', category:p.category||'', company:p.company||'', price: priceOf(p,QE.priceType) ?? '', qty:'' });
  }
  qeDirty=true; renderPicker(); renderQEItems();
}

/* ---------- حفظ / حذف ---------- */
async function saveQuote(silent){
  qeField();
  if(!QE.client.trim()) { toast('اكتب اسم العميل (إلى / السادة)'); $('qeClient').focus(); return false; }
  if(!QE.items.length) { toast('ضيف مركب واحد على الأقل'); return false; }
  loading(true);
  try{
    const j = await api('saveQuote',{quote:QE});
    const i = QUOTES.findIndex(x=>x.id===j.quote.id);
    if(i>=0) QUOTES[i]=j.quote; else QUOTES.push(j.quote);
    QE = JSON.parse(JSON.stringify(j.quote)); QE.date=String(QE.date).slice(0,10);
    qeDirty=false;
    $('qeTitle').textContent = `عرض ${QE.number}`; $('qeDelete').classList.remove('hidden');
    if(!silent) toast('اتحفظ العرض ✅');
    return true;
  }catch(e){
    toast(/أمر غير معروف/.test(e.message) ? 'لازم تحدّث كود Apps Script الأول (عروض الأسعار)' : e.message);
    return false;
  }finally{ loading(false); }
}
function askDeleteQuote(){
  askConfirm(`تحذف عرض ${QE.number} (${QE.client})؟`,'أيوه احذف', async ()=>{
    loading(true);
    try{ await api('deleteQuote',{id:QE.id}); QUOTES=QUOTES.filter(x=>x.id!==QE.id); qeDirty=false; backToQuotes(true); toast('اتحذف'); }
    catch(e){ toast(e.message); } finally{ loading(false); }
  });
}
function askConfirm(text, yes, fn){
  $('confirmText').textContent = text;
  $('confirmYes').textContent = yes;
  $('confirmYes').onclick = ()=>{ closeModal('confirmModal'); $('confirmYes').textContent='أيوه احذف'; fn(); };
  $('confirmModal').classList.remove('hidden');
}

/* ---------- صفحات العرض (A4) ---------- */
function chunkItems(items){
  const pages=[]; let i=0, first=true;
  while(i<items.length || !pages.length){
    const cap = first ? ROWS_FIRST : ROWS_OTHER;
    pages.push(items.slice(i,i+cap)); i+=cap; first=false;
  }
  const lastCap = pages.length===1 ? ROWS_FIRST : ROWS_OTHER;
  const needFooterPage = pages[pages.length-1].length > lastCap-3;
  return { pages, needFooterPage };
}
function pagesHTML(q){
  const showQty = q.items.some(it=>num(it.qty));
  const total = quoteTotal(q);
  const { pages, needFooterPage } = chunkItems(q.items);
  const totalPages = pages.length + (needFooterPage?1:0);
  const priceLabel = q.priceType==='retail' ? 'السعر' : 'سعر الجملة';
  let n = 0;
  const head = `<div class="qp-head">
      <div class="qp-co"><img src="icon-192.png" alt=""><div><b>${COMPANY_NAME}</b><span>Agri Time</span></div></div>
      <div class="qp-title"><b>عرض أسعار</b><span>رقم: ${esc(q.number||'—')}</span><span>التاريخ: ${fmtDate(q.date)}</span></div>
    </div>
    <div class="qp-to"><span>إلى / السادة:</span> <b>${esc(q.client)}</b></div>`;
  const smallHead = `<div class="qp-head small"><div class="qp-co"><img src="icon-192.png" alt=""><b>${COMPANY_NAME}</b></div><div class="qp-title"><span>عرض أسعار ${esc(q.number||'')} — ${esc(q.client)}</span></div></div>`;
  const thead = `<tr><th style="width:34px">م</th><th style="width:78px">الصورة</th><th>الصنف</th><th style="width:92px">العبوة</th><th style="width:96px">${priceLabel}</th>${showQty?'<th style="width:62px">الكمية</th><th style="width:96px">الإجمالي</th>':''}</tr>`;
  const row = it => { n++; const src=qThumb(it,200);
    return `<tr><td>${n}</td>
      <td>${src?`<img src="${esc(src)}" crossorigin="anonymous">`:'<span class="qp-noimg">🧪</span>'}</td>
      <td class="qp-name"><b>${esc(it.name)}</b>${it.ai?`<small>المادة الفعالة: ${esc(it.ai)}</small>`:''}${(it.category||it.company)?`<small>${esc([it.category,it.company].filter(Boolean).join(' • '))}</small>`:''}</td>
      <td>${esc(it.unit||'—')}</td><td class="qp-num">${money(it.price)}</td>
      ${showQty?`<td class="qp-num">${num(it.qty)??'—'}</td><td class="qp-num">${num(it.qty)?money(num(it.qty)*(num(it.price)||0)):'—'}</td>`:''}</tr>`; };
  const footer = `<div class="qp-foot">
      ${total?`<div class="qp-total">الإجمالي: <b>${money(total)} ج.م</b></div>`:''}
      ${q.notes?`<div class="qp-notes"><b>ملاحظات:</b><div>${esc(q.notes).replace(/\n/g,'<br>')}</div></div>`:''}
      <div class="qp-sign"><span>مع تحيات</span><b>${COMPANY_NAME}</b></div>
    </div>`;
  let html = '';
  pages.forEach((chunk,pi)=>{
    const isLast = pi===pages.length-1;
    html += `<div class="qpage">${pi===0?head:smallHead}
      <table class="qp-table"><thead>${thead}</thead><tbody>${chunk.map(row).join('')}</tbody></table>
      ${isLast && !needFooterPage ? footer : ''}
      <div class="qp-pn">صفحة ${pi+1} من ${totalPages} • الأسعار بالجنيه المصري</div></div>`;
  });
  if(needFooterPage) html += `<div class="qpage">${smallHead}${footer}<div class="qp-pn">صفحة ${totalPages} من ${totalPages}</div></div>`;
  return html;
}

/* ---------- معاينة / مشاركة / طباعة ---------- */
async function previewQuote(){
  if(qeDirty || !QE.id){ const ok = await saveQuote(true); if(!ok) return; }
  $('qpPages').innerHTML = pagesHTML(QE);
  fitPreview();
  $('quotePreview').classList.remove('hidden');
}
function fitPreview(){
  const w = Math.min(window.innerWidth-16, 820);
  const s = w/794;
  $('qpPages').querySelectorAll('.qpage').forEach(pg=>{
    pg.style.transform=`scale(${s})`; pg.style.transformOrigin='top right';
    pg.style.marginBottom = `${-(1123*(1-s))+12}px`;
  });
  $('qpPages').style.width = `${w}px`;
}
window.addEventListener('resize', ()=>{ if(!$('quotePreview').classList.contains('hidden')) fitPreview(); });

function loadScript(src){
  return new Promise((res,rej)=>{
    if(document.querySelector(`script[src="${src}"]`)) return res();
    const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=()=>rej(new Error('مقدرتش أحمّل '+src)); document.head.appendChild(s);
  });
}
async function toDataURL(url){
  const r = await fetch(url,{mode:'cors'}); if(!r.ok) throw 0;
  const b = await r.blob();
  return await new Promise(res=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.readAsDataURL(b); });
}
async function buildPdfBlob(){
  await Promise.all([loadScript('lib/html2canvas.min.js'), loadScript('lib/jspdf.umd.min.js')]);
  if(document.fonts && document.fonts.ready) await document.fonts.ready;
  const holder = document.createElement('div');
  holder.className = 'qp-holder';
  holder.innerHTML = pagesHTML(QE);
  document.body.appendChild(holder);
  try{
    // الصور اللي من النت نحولها لبيانات داخلية علشان تظهر في الـ PDF
    await Promise.all([...holder.querySelectorAll('img')].map(async im=>{
      if(im.src.startsWith('data:')) return;
      try{ im.src = await toDataURL(im.src); }catch(e){}
      if(!im.complete) await new Promise(r=>{ im.onload=r; im.onerror=r; });
    }));
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit:'pt', format:'a4', compress:true });
    const pages = holder.querySelectorAll('.qpage');
    for(let i=0;i<pages.length;i++){
      const canvas = await html2canvas(pages[i], { scale:2, useCORS:true, backgroundColor:'#ffffff', logging:false });
      if(i) pdf.addPage('a4');
      pdf.addImage(canvas.toDataURL('image/jpeg',0.88), 'JPEG', 0, 0, 595.28, 841.89);
    }
    return pdf.output('blob');
  } finally { holder.remove(); }
}
function pdfName(){ return `عرض أسعار ${QE.number} - ${QE.client}.pdf`.replace(/[\\/:*?"<>|]/g,'-'); }
async function sharePdf(){
  loading(true);
  try{
    const blob = await buildPdfBlob();
    const file = new File([blob], pdfName(), { type:'application/pdf' });
    if(navigator.canShare && navigator.canShare({ files:[file] })){
      loading(false);
      await navigator.share({ files:[file], title:`عرض أسعار ${QE.number}` });
    } else downloadBlob(blob);
  }catch(e){ if(e && e.name!=='AbortError') toast('حصلت مشكلة في عمل الـ PDF — جرّب "تحميل"'); }
  finally{ loading(false); }
}
async function downloadPdf(){
  loading(true);
  try{ downloadBlob(await buildPdfBlob()); toast('اتحمل الملف ✅'); }
  catch(e){ toast('حصلت مشكلة في عمل الـ PDF'); }
  finally{ loading(false); }
}
function downloadBlob(blob){
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=pdfName();
  document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
function printQuote(){
  $('printArea').innerHTML = pagesHTML(QE);
  setTimeout(()=>window.print(), 300);
}
