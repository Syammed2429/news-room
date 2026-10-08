// Sets the theme before first paint so there's no flash. It's its own file because the
// CSP blocks inline scripts.
try {
  const saved = localStorage.getItem('news-theme')
  const dark = saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.classList.toggle('dark', dark)
} catch {
  // localStorage can be blocked (private mode), stay on the default
}
