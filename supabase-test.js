(() => {
  const el = document.getElementById('supabaseStatus');
  if (!el) return;

  function setStatus(kind, text) {
    el.classList.remove('is-checking', 'is-connected', 'is-warning', 'is-error');
    el.classList.add(kind);
    el.textContent = text;
  }

  async function checkSupabase() {
    setStatus('is-checking', 'Supabase: проверка подключения');
    try {
      const response = await fetch(`/api/supabase-test?t=${Date.now()}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });

      if (!response.ok) {
        setStatus('is-error', `Supabase: ошибка API ${response.status}`);
        return;
      }

      const data = await response.json();

      if (data.status === 'connected') {
        const name = data.project?.name ? ` · ${data.project.name}` : '';
        setStatus('is-connected', `Supabase: подключено${name}`);
        return;
      }

      if (data.status === 'configured_no_rows') {
        setStatus('is-warning', 'Supabase: подключено, строк не видно');
        return;
      }

      if (data.status === 'rls_blocked') {
        setStatus('is-warning', 'Supabase: подключено, доступ закрыт RLS');
        return;
      }

      if (data.status === 'missing_env') {
        setStatus('is-error', 'Supabase: переменные не найдены');
        return;
      }

      setStatus('is-error', 'Supabase: ошибка подключения');
    } catch (error) {
      setStatus('is-error', 'Supabase: функция недоступна');
    }
  }

  checkSupabase();
})();
