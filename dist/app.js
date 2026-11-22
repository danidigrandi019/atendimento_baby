import { openDatabase, listClients, listPhotos, createClient, addPhotos, setClientStatus, deletePhoto, deleteClient } from './storage.js';

const icons = {
  camera:'<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13.5" r="3.5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', check:'<path d="m5 12 4 4L19 6"/>', close:'<path d="m6 6 12 12M18 6 6 18"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
  layers:'<path d="m12 3 10 6-10 6L2 9zM2 15l10 6 10-6M2 12l10 6 10-6"/>',
  phone:'<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4M12 18h.01"/>',
  gallery:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1"/><path d="m21 15-6-6L3 21"/>',
  left:'<path d="m15 6-6 6 6 6"/>', right:'<path d="m9 6 6 6-6 6"/>',
  trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
  zoom:'<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>',
  undo:'<path d="M3 10h10a6 6 0 0 1 0 12M3 10l6-6M3 10l6 6"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.camera}</svg>`;
document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
const $ = id => document.getElementById(id);
const num = id => String(id).padStart(2, '0');
const plural = n => `${n} ${n === 1 ? 'foto' : 'fotos'}`;
const colors = [['#a34543','#f9e6e3'],['#657e54','#eaf0dc'],['#5e7e94','#e4edf4'],['#a77b37','#f6edda'],['#8b6b91','#f1e8f3'],['#567f78','#e2efeb']];
const color = id => colors[(id-1)%colors.length];
const tone = id => `--accent:${color(id)[0]};--tint:${color(id)[1]}`;
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time = timestamp => new Date(timestamp).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
const shortDate = timestamp => new Date(timestamp).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
let clients = [], photos = [], selected = null, view = 'active', ready = false, busy = false, creating = false;
let renderRevision = 0, toastTimer, pendingImport = null, viewerIndex = 0, viewerClient = null;
let objectUrls = [], viewerUrl = null;
let channel;
try { channel = new BroadcastChannel('vitrine-updates'); } catch {}
function releaseUrls() { objectUrls.forEach(URL.revokeObjectURL); objectUrls = []; }
function url(blob) { const value = URL.createObjectURL(blob); objectUrls.push(value); return value; }
function current() { return clients.find(c => c.id === selected); }
function notify(message, error = false) { clearTimeout(toastTimer); $('toast').textContent = message; $('toast').classList.toggle('error',error); $('toast').hidden = false; toastTimer = setTimeout(() => { $('toast').hidden = true; }, error ? 9000 : 4200); }
function errorMessage(error) { return error?.name === 'QuotaExceededError' ? 'O aparelho está sem espaço para salvar. Libere espaço e toque em Tentar salvar.' : error?.message || 'Não foi possível salvar. Tente novamente.'; }
function rememberSelection() { try { localStorage.setItem('vitrine-selected', String(selected || '')); } catch {} }
function updateControls() {
  for (const id of ['rail-new','new-client']) $(id).disabled = !ready || busy || creating;
  $('camera').disabled = !ready || busy || current()?.status !== 'active';
  $('camera').querySelector('span:last-child').textContent = busy ? 'Salvando…' : `Foto · Cliente ${num(selected || 1)}`;
  $('storage-label').textContent = busy ? 'Salvando suas fotos…' : ready ? 'Salvo neste aparelho' : 'Armazenamento indisponível';
}
async function refresh() {
  const revision = ++renderRevision;
  const freshClients = await listClients();
  if (revision !== renderRevision) return;
  clients = freshClients;
  if (view === 'active' && !clients.some(c => c.id === selected && c.status === 'active')) selected = clients.find(c=>c.status==='active')?.id || null;
  if (view === 'detail' && !clients.some(c => c.id === selected)) { view = 'history'; selected = null; }
  const freshPhotos = selected && view !== 'history' ? await listPhotos(selected) : [];
  if (revision !== renderRevision) return;
  photos = freshPhotos;
  rememberSelection();
  render();
}
function signal() { channel?.postMessage('changed'); }
channel?.addEventListener('message', () => { if (!$('viewer').open) refresh().catch(e=>notify(errorMessage(e),true)); });
function render() {
  releaseUrls();
  const active = clients.filter(c=>c.status==='active');
  const finished = clients.filter(c=>c.status==='finished');
  $('active-count').textContent = active.length;
  $('history-count').textContent = finished.length;
  $('active-tab').classList.toggle('active',view==='active');
  $('history-tab').classList.toggle('active',view!=='active');
  $('active-tab').setAttribute('aria-pressed',String(view==='active'));
  $('history-tab').setAttribute('aria-pressed',String(view!=='active'));
  $('rail-empty').hidden = active.length > 0;
  $('client-list').innerHTML = active.map(c => `<button class="client-card ${selected===c.id && view==='active'?'selected':''}" data-select="${c.id}" style="${tone(c.id)}" aria-pressed="${selected===c.id && view==='active'}" aria-label="Cliente ${num(c.id)}, ${plural(c.count)}"><span class="client-avatar ${c.cover?'has-photo':''}">${c.cover?`<img src="${url(c.cover)}" alt="">`:num(c.id)}</span><span class="client-copy"><strong>Cliente ${num(c.id)}</strong><small>${plural(c.count)}</small></span>${selected===c.id && view==='active'?'<span class="selected-indicator"></span>':''}</button>`).join('');
  $('action-dock').hidden = !ready || (view==='active' && !selected);
  if (view === 'history') renderHistory(finished);
  else if (selected && current()) renderDetail(current());
  else renderWelcome();
  if (pendingImport) {
    const banner = document.createElement('div');
    banner.className = 'busy-strip';
    banner.innerHTML = busy ? `Salvando ${plural(pendingImport.files.length)} no Cliente ${num(pendingImport.targetId)}…` : `As fotos do Cliente ${num(pendingImport.targetId)} ainda não foram salvas. <button class="text-button" data-retry>Tentar salvar</button><button class="text-button" data-discard>Descartar</button>`;
    $('main').prepend(banner);
  }
  updateControls();
  $('camera').hidden = view==='history' || current()?.status==='finished';
}
function renderWelcome() {
  $('main').innerHTML = `<section class="welcome"><div class="welcome-art" aria-hidden="true"><div class="art-back"></div><div class="art-front">${icon('camera')}</div><div class="art-number">01</div><div class="art-check">${icon('check')}</div></div><span class="eyebrow">PRONTO PARA O PRÓXIMO CLIENTE</span><h1>Vários clientes.<br><span>Tudo no lugar.</span></h1><p>Fotografe os sapatos da vitrine.<br>Cada cliente fica com suas próprias fotos.</p><button class="button primary" data-new>${icon('plus')} Começar atendimento</button><div class="welcome-hint">${icon('camera')} Sem nomes. Sem formulários. Só fotos.</div><div class="welcome-steps"><span><b>1</b> Abra um cliente</span><span><b>2</b> Tire as fotos</span><span><b>3</b> Alterne</span></div></section>`;
}
function renderDetail(client) {
  const isActive = client.status === 'active';
  $('main').innerHTML = `<section style="${tone(client.id)}"><div class="detail-heading"><div class="heading-left"><span class="eyebrow">${isActive?'EM ATENDIMENTO':'ATENDIMENTO FINALIZADO'}</span><div class="title-row"><span class="client-color"></span><h1>Cliente ${num(client.id)}</h1></div><p class="detail-subtitle">${plural(client.count)} · iniciado às ${time(client.createdAt)}</p></div><button class="finish" ${busy?'disabled':''} data-${isActive?'finish':'reopen'}="${client.id}">${icon(isActive?'check':'undo')}${isActive?'Finalizar':'Reabrir'}</button></div>${!isActive?'<div class="readonly-note">Este atendimento está guardado. Toque em Reabrir para adicionar mais fotos.</div>':''}<div class="section-line"><span>ESCOLHAS DO CLIENTE</span>${isActive?`<button class="text-button" data-gallery ${busy?'disabled':''}>${icon('gallery')} Da galeria</button>`:''}</div>${photos.length?`<div class="photo-grid">${photos.map((p,i)=>`<button class="photo-card" data-photo="${i}" aria-label="Abrir foto ${i+1} do Cliente ${num(client.id)}"><img src="${url(p.thumb)}" alt="Sapato ${i+1} do Cliente ${num(client.id)}" loading="lazy"><span class="photo-tag">FOTO ${num(i+1)}</span><span class="photo-zoom">${icon('zoom')}</span></button>`).join('')}${isActive?`<button class="add-photo-card" data-camera ${busy?'disabled':''}>${icon('plus')}Mais uma foto</button>`:''}</div>`:`<div class="empty-client"><div class="empty-camera">${icon('camera')}</div><h2>Qual sapato ele escolheu?</h2><p>Fotografe a primeira escolha.<br>As próximas fotos ficam aqui também.</p>${isActive?`<button class="text-button" data-camera ${busy?'disabled':''}>${icon('camera')} Tirar a primeira foto</button>`:''}</div>`}<div class="photos-footnote">${icon('lock')} Essas fotos pertencem só ao Cliente ${num(client.id)}.</div><div class="mobile-storage">Salvo neste navegador, neste aparelho.</div></section>`;
}
function renderHistory(finished) {
  $('main').innerHTML = `<section><div class="history-heading"><span class="eyebrow">TUDO GUARDADO</span><h1>Finalizados<span class="brand-dot">.</span></h1><p>Os atendimentos que você já concluiu.<br>Precisa de mais um sapato? É só reabrir.</p></div>${finished.length?`<div class="history-grid">${finished.sort((a,b)=>b.finishedAt-a.finishedAt).map(c=>`<article class="history-card"><button data-open-history="${c.id}" aria-label="Ver Cliente ${num(c.id)}">${c.cover?`<img src="${url(c.cover)}" alt="Primeira escolha do Cliente ${num(c.id)}">`:icon('camera')}</button><div class="history-card-body"><h2>Cliente ${num(c.id)}</h2><p>${plural(c.count)} · ${shortDate(c.createdAt)} às ${time(c.createdAt)}</p><div class="history-actions"><button class="button secondary" data-reopen="${c.id}">${icon('undo')} Reabrir</button><button class="icon-button" data-delete-client="${c.id}" aria-label="Excluir Cliente ${num(c.id)}">${icon('trash')}</button></div></div></article>`).join('')}</div>`:`<div class="history-empty">${icon('check')}<h2>Ainda nenhum por aqui.</h2><p>Quando você finalizar um cliente,<br>as fotos dele ficam guardadas aqui.</p><button class="button secondary" data-go-active>Voltar aos atendimentos</button></div>`}</section>`;
}
async function newClient() {
  if (!ready || busy || creating) return;
  creating = true; updateControls();
  try { const c = await createClient(); selected = c.id; view='active'; await refresh(); signal(); notify(`Cliente ${num(c.id)} aberto. Pode fotografar!`); $('client-list').querySelector(`[data-select="${c.id}"]`)?.scrollIntoView({block:'nearest',inline:'nearest'}); }
  catch(e) { notify(errorMessage(e),true); }
  finally { creating=false; updateControls(); }
}
function choosePhoto(kind='camera') {
  if (busy || !ready || current()?.status !== 'active') return;
  if (pendingImport) { notify('Salve ou descarte as fotos pendentes primeiro.',true); return; }
  const input = $(kind+'-input');
  input.dataset.targetId = String(selected);
  input.value = '';
  input.click();
}
async function compress(file) {
  if (file.type && !file.type.startsWith('image/')) throw new Error('Selecione apenas imagens.');
  const source = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('Esta imagem não abriu. Tente tirar uma nova foto com a câmera.'));image.src=source;});
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('A imagem está vazia.');
    const makeBlob = (max, quality) => new Promise((resolve,reject)=>{
      const scale = Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
      const context = canvas.getContext('2d');
      if (!context) return reject(new Error('Não foi possível preparar a foto. Tente novamente.'));
      context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
      canvas.toBlob(blob=>{canvas.width=0;canvas.height=0;blob?resolve(blob):reject(new Error('Não foi possível preparar a foto.'));},'image/jpeg',quality);
    });
    return { blob:await makeBlob(1600,.84), thumb:await makeBlob(480,.8) };
  } finally { URL.revokeObjectURL(source); image.src=''; }
}
async function saveImport() {
  if (!pendingImport || busy) return;
  const batch = pendingImport;
  busy = true; render();
  try {
    if (!batch.prepared) { batch.prepared=[]; for (const file of batch.files) batch.prepared.push(await compress(file)); }
    const count = await addPhotos(batch.targetId,batch.prepared);
    pendingImport=null;
    busy=false;
    await refresh(); signal();
    notify(`${plural(count)} ${count===1?'salva':'salvas'} no Cliente ${num(batch.targetId)}.`);
  } catch(e) {
    if (batch.prepared?.length !== batch.files.length) batch.prepared=null;
    busy=false; render(); notify(errorMessage(e),true);
  }
}
for (const inputId of ['camera-input','gallery-input']) $(inputId).addEventListener('change',async e=>{
  const files=Array.from(e.target.files||[]);
  if (!files.length) return;
  const targetId=Number(e.target.dataset.targetId);
  if (!targetId || pendingImport) { notify('As fotos anteriores ainda precisam ser salvas.',true); return; }
  pendingImport={ targetId, files, prepared:null };
  e.target.value='';
  await saveImport();
});
function confirmAction(title,description) {
  $('confirm-title').textContent=title;$('confirm-description').textContent=description;
  $('confirm').showModal();
  return new Promise(resolve=>{
    let answered=false;
    const done = result => { if(answered)return;answered=true;$('confirm').close();$('confirm-yes').onclick=null;$('confirm-cancel').onclick=null;resolve(result); };
    $('confirm-yes').onclick=()=>done(true);$('confirm-cancel').onclick=()=>done(false);
    $('confirm').addEventListener('cancel',()=>done(false),{once:true});
  });
}
function openViewer(index) { viewerIndex=index;viewerClient=selected;updateViewer();$('viewer').showModal(); }
function updateViewer() {
  if(viewerUrl) URL.revokeObjectURL(viewerUrl);
  viewerUrl=URL.createObjectURL(photos[viewerIndex].blob);
  $('viewer-image').src=viewerUrl;
  $('viewer-image').alt=`Foto ${viewerIndex+1} do Cliente ${num(viewerClient)}`;
  $('viewer-label').textContent=`Cliente ${num(viewerClient)} · Suas escolhas`;
  $('viewer-position').textContent=`${viewerIndex+1} de ${photos.length}`;
  $('viewer-prev').disabled=viewerIndex===0;$('viewer-next').disabled=viewerIndex===photos.length-1;
}
$('viewer-close').onclick=()=>$('viewer').close();
$('viewer').addEventListener('close',()=>{if(viewerUrl)URL.revokeObjectURL(viewerUrl);viewerUrl=null;$('viewer-image').removeAttribute('src');});
$('viewer-prev').onclick=()=>{if(viewerIndex>0){viewerIndex--;updateViewer();}};
$('viewer-next').onclick=()=>{if(viewerIndex<photos.length-1){viewerIndex++;updateViewer();}};
$('viewer').addEventListener('keydown',e=>{if(e.key==='ArrowLeft')$('viewer-prev').click();if(e.key==='ArrowRight')$('viewer-next').click();});
$('photo-delete').onclick=async()=>{
  const p=photos[viewerIndex];const clientId=viewerClient;
  if(!await confirmAction('Excluir esta foto?',`Ela será removida do Cliente ${num(clientId)}. As outras fotos continuam guardadas.`))return;
  try {await deletePhoto(p.id,clientId);$('viewer').close();await refresh();signal();notify('Foto excluída.');}catch(e){notify(errorMessage(e),true);}
};
$('camera').onclick=()=>choosePhoto();
$('new-client').onclick=$('rail-new').onclick=newClient;
$('help').onclick=()=>$('info').showModal();
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
$('active-tab').onclick=async()=>{view='active';await refresh();};
$('history-tab').onclick=async()=>{view='history';await refresh();};
$('client-list').onclick=async e=>{const b=e.target.closest('[data-select]');if(b){selected=Number(b.dataset.select);view='active';await refresh();}};
$('main').addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;
  try {
    if(b.hasAttribute('data-new'))await newClient();
    else if(b.hasAttribute('data-camera'))choosePhoto();
    else if(b.hasAttribute('data-gallery'))choosePhoto('gallery');
    else if(b.hasAttribute('data-photo'))openViewer(Number(b.dataset.photo));
    else if(b.hasAttribute('data-finish')){
      if(busy || pendingImport){notify('Salve as fotos pendentes antes de finalizar.',true);return;}
      const id=Number(b.dataset.finish);await setClientStatus(id,'finished');await refresh();signal();notify(`Cliente ${num(id)} finalizado. As fotos estão em Finalizados.`);
    } else if(b.hasAttribute('data-reopen')){
      const id=Number(b.dataset.reopen);await setClientStatus(id,'active');selected=id;view='active';await refresh();signal();notify(`Cliente ${num(id)} reaberto.`);
    } else if(b.hasAttribute('data-open-history')){selected=Number(b.dataset.openHistory);view='detail';await refresh();}
    else if(b.hasAttribute('data-delete-client')){
      const id=Number(b.dataset.deleteClient);if(!await confirmAction(`Excluir Cliente ${num(id)}?`,'Todas as fotos desse atendimento serão apagadas deste aparelho. Os outros clientes não serão alterados.'))return;
      await deleteClient(id);await refresh();signal();notify('Atendimento excluído.');
    } else if(b.hasAttribute('data-go-active')){view='active';await refresh();}
    else if(b.hasAttribute('data-retry'))await saveImport();
    else if(b.hasAttribute('data-discard')){if(await confirmAction('Descartar fotos pendentes?','Essas fotos ainda não foram salvas. Você precisará fotografá-las novamente.')){pendingImport=null;render();}}
  } catch(error){notify(errorMessage(error),true);}
});
window.addEventListener('beforeunload',e=>{if(busy||pendingImport){e.preventDefault();e.returnValue='';}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&ready&&!busy&&!$('viewer').open)refresh().catch(e=>notify(errorMessage(e),true));});
$('today').textContent=new Date().toLocaleDateString('pt-BR',{day:'numeric',month:'short'}).replace('.','');
try {
  await openDatabase();ready=true;
  try {selected=Number(localStorage.getItem('vitrine-selected'))||null;}catch{}
  await refresh();
} catch(error) {
  ready=false;updateControls();
  $('main').innerHTML=`<section class="error-panel"><h1>Não consegui abrir suas fotos.</h1><p>O navegador precisa permitir o armazenamento deste site.<br>Abra em uma aba normal do Safari e tente novamente.</p><p>${escape(errorMessage(error))}</p><button class="button primary" id="retry-open">Tentar novamente</button></section>`;
  $('retry-open').onclick=()=>location.reload();
}
