(() => {
  function initResidence(){
    const select = document.getElementById('residence');
    const other = document.getElementById('residenceOther');
    if(!select || !other) return;

    const otherOption = Array.from(select.options).find(o => o.textContent.trim().toLowerCase() === 'otro');
    if(!otherOption) return;
    otherOption.dataset.customOption = 'true';
    otherOption.dataset.baseValue = '__other__';

    function sync(){
      const selected = select.selectedOptions?.[0];
      const isOther = selected === otherOption;
      other.classList.toggle('hidden', !isOther);
      other.required = isOther;
      if(!isOther){
        other.value = '';
        otherOption.value = '__other__';
      } else {
        otherOption.value = other.value.trim() || '__other__';
        if(document.activeElement !== other) setTimeout(() => other.focus(), 0);
      }
    }

    select.addEventListener('change', sync);
    other.addEventListener('input', () => {
      if(select.selectedOptions?.[0] === otherOption){
        otherOption.value = other.value.trim() || '__other__';
      }
    });

    const start = document.getElementById('startBtn');
    start?.addEventListener('click', (event) => {
      if(select.selectedOptions?.[0] !== otherOption) return;
      const value = other.value.trim();
      if(value.length < 2){
        event.preventDefault();
        event.stopImmediatePropagation();
        const msg = document.getElementById('registrationMsg');
        if(msg) msg.textContent = 'Escribí el lugar de residencia.';
        other.focus();
        return;
      }
      otherOption.value = value;
    }, true);

    const newSim = document.getElementById('newSimulationBtn');
    newSim?.addEventListener('click', () => {
      setTimeout(() => {
        select.value = '';
        other.value = '';
        otherOption.value = '__other__';
        other.classList.add('hidden');
        other.required = false;
      }, 0);
    });

    sync();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initResidence);
  else initResidence();
})();
