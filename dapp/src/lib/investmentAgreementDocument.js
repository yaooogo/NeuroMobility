import companySignature from '../assets/images/Neuro Foundation Ltd Signature Logo.png';

export async function downloadInvestmentAgreement(s) {
  if (!s) return;
  let companySignatureData;
  try {
    const response = await fetch(companySignature);
    if (!response.ok) throw new Error('Unable to load company signature');
    const blob = await response.blob();
    companySignatureData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    throw new Error('Unable to load company signature');
  }
  const escape = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(s.agreement_id)}</title><style>body{max-width:850px;margin:32px auto;padding:20px;font:15px/1.8 sans-serif;color:#25202c}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}img{max-width:360px;width:100%}h2{color:#7629bd}</style><h2>NEURO Mobility</h2><pre>${escape(s.content)}</pre><p>协议状态：已签署</p><p>订单编号：${escape(s.order_id)}</p><p>签署日期：${escape(s.signed_at)}</p><p>甲方电子签名：Neuro Foundation Ltd</p><img alt="甲方电子签名" src="${escape(companySignatureData)}"><p>乙方电子签名：</p><img alt="乙方电子签名" src="${escape(s.signature)}"></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const anchor = globalThis.document.createElement('a');
  anchor.href = url;
  anchor.download = `${s.agreement_id}.html`;
  globalThis.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
