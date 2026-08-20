document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('login-error');
  errEl.classList.remove('show');
  const email = document.getElementById('l-email').value.trim();
  const password = document.getElementById('l-password').value;
  const btn = document.getElementById('login-btn');
  btn.disabled = true; btn.innerHTML = '<span class="loader"></span> جارٍ الدخول...';

  try{
    const { data, error } = await window.sb.auth.signInWithPassword({ email, password });
    if(error) throw error;

    const { data: profile } = await window.sb.from('profiles').select('*').eq('id', data.user.id).single();

    if(profile && profile.role === 'admin'){
      window.location.href = '/admin/dashboard.html';
      return;
    }

    // store owner: check store status
    const { data: store } = await window.sb.from('stores').select('*').eq('owner_id', data.user.id).maybeSingle();

    if(!store){
      errEl.textContent = 'لا يوجد متجر مرتبط بهذا الحساب.';
      errEl.classList.add('show');
      await window.sb.auth.signOut();
    } else if(store.status === 'pending'){
      errEl.textContent = 'طلب متجرك لا يزال قيد المراجعة من إدارة روابط. سنُبلغك بالبريد فور الموافقة.';
      errEl.classList.add('show');
    } else if(store.status === 'rejected'){
      errEl.textContent = 'تم رفض طلب تسجيل متجرك' + (store.rejection_reason ? (': ' + store.rejection_reason) : '.') + ' — لأي استفسار تواصل مع الدعم.';
      errEl.classList.add('show');
    } else if(store.status === 'suspended'){
      errEl.textContent = 'تم إيقاف متجرك مؤقتًا' + (store.suspension_reason ? (': ' + store.suspension_reason) : '.') + ' — تواصل مع الدعم لإعادة التفعيل.';
      errEl.classList.add('show');
    } else {
      window.location.href = '/store/dashboard.html';
      return;
    }
  }catch(err){
    console.error(err);
    errEl.textContent = err.message && err.message.includes('Invalid login') ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : (err.message || 'حدث خطأ غير متوقع.');
    errEl.classList.add('show');
  }
  btn.disabled = false; btn.textContent = 'دخول';
});

// if already logged in, redirect
(async () => {
  const info = await getSessionUser();
  if(info){
    if(info.profile?.role === 'admin'){ window.location.href = '/admin/dashboard.html'; return; }
    const { data: store } = await window.sb.from('stores').select('status').eq('owner_id', info.user.id).maybeSingle();
    if(store && store.status === 'approved'){ window.location.href = '/store/dashboard.html'; }
  }
})();
