function slugify(str){
  return str.toString().trim()
    .replace(/[^\u0621-\u064Aa-zA-Z0-9\s-]/g,'')
    .replace(/\s+/g,'-')
    .toLowerCase() || ('store-' + Date.now());
}

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('form-error');
  errEl.classList.remove('show');

  const storeName = document.getElementById('f-store-name').value.trim();
  const email = document.getElementById('f-email').value.trim();
  const phone = document.getElementById('f-phone').value.trim();
  const city = document.getElementById('f-city').value.trim();
  const cr = document.getElementById('f-cr').value.trim();
  const desc = document.getElementById('f-desc').value.trim();
  const pass = document.getElementById('f-password').value;
  const pass2 = document.getElementById('f-password2').value;
  const terms = document.getElementById('f-terms').checked;

  if(pass !== pass2){
    errEl.textContent = 'كلمتا المرور غير متطابقتين.';
    errEl.classList.add('show');
    return;
  }
  if(!terms){
    errEl.textContent = 'يجب الموافقة على الشروط والأحكام وسياسة الخصوصية للمتابعة.';
    errEl.classList.add('show');
    return;
  }

  const btn = document.getElementById('submit-btn');
  btn.disabled = true; btn.innerHTML = '<span class="loader"></span> جارٍ الإرسال...';

  try{
    const { data: signUpData, error: signUpErr } = await window.sb.auth.signUp({
      email, password: pass,
      options: { data: { full_name: storeName } }
    });
    if(signUpErr) throw signUpErr;

    const userId = signUpData.user ? signUpData.user.id : null;
    if(!userId) throw new Error('تعذّر إنشاء الحساب. حاول مرة أخرى.');

    let slug = slugify(storeName);
    const { error: storeErr } = await window.sb.from('stores').insert({
      owner_id: userId,
      store_name: storeName,
      slug: slug + '-' + Math.floor(Math.random()*9000+1000),
      email, phone, city,
      cr_number: cr || null,
      description: desc || null,
      accepted_terms: true,
      status: 'pending'
    });
    if(storeErr) throw storeErr;

    // best-effort notification (requires an email provider connected to the edge function)
    try{
      await window.sb.functions.invoke('notify-store-event', {
        body: { type: 'new_registration', store_name: storeName, store_email: email }
      });
    }catch(notifyErr){ console.warn('notify skipped', notifyErr); }

    document.getElementById('register-form').style.display = 'none';
    document.getElementById('success-card').style.display = 'block';
  }catch(err){
    console.error(err);
    errEl.textContent = translateAuthError(err.message);
    errEl.classList.add('show');
    btn.disabled = false; btn.textContent = 'إرسال طلب التسجيل';
  }
});

function translateAuthError(msg){
  if(!msg) return 'حدث خطأ غير متوقع، حاول مرة أخرى.';
  if(msg.includes('already registered') || msg.includes('already been registered')) return 'هذا البريد الإلكتروني مسجّل مسبقًا. جرّب تسجيل الدخول.';
  if(msg.includes('Password')) return 'كلمة المرور ضعيفة، استخدم 8 أحرف على الأقل.';
  if(msg.includes('duplicate key')) return 'يبدو أن هناك تسجيل سابق بنفس البيانات.';
  return msg;
}
