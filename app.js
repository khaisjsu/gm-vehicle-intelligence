const toast = document.querySelector('#toast');
const buttons = document.querySelectorAll('.diagnose-button');

buttons.forEach((button) => {
  button.addEventListener('click', () => {
    button.disabled = true;
    button.innerHTML = 'Session active <span>✓</span>';
    button.style.color = '#7ce3a5';
    button.style.borderColor = '#3d9d6a';
    toast.classList.add('show');
    window.setTimeout(() => toast.classList.remove('show'), 4200);
  });
});

document.querySelector('#inspectButton').addEventListener('click', () => {
  document.querySelector('#vehicles').scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.querySelector('#vehicles').animate([{ boxShadow: '0 0 0 1px #9cecf0' }, { boxShadow: '0 0 0 0 transparent' }], { duration: 900 });
});
