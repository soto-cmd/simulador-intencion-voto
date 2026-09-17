(() => {
  function initResidence(){
    const select = document.getElementById('residence');
    const other = document.getElementById('residenceOther');
    if(!select || !other) return;

    const otherOption = Array.from(select.options).find(o => o.textContent.trim().toLowerCase() === 'otro');
    const santaMariaOption = Array.from(select.options).find(o => o.textContent.trim() === 'Santa María de Fe');
    if(!otherOption || !santaMariaOption) return;

    otherOption.dataset.customOption = 'true';
    otherOption.dataset.baseValue = '__other__';
    santaMariaOption.dataset.baseValue = 'Santa María de Fe';

    let barrioWrap = document.getElementById('neighborhoodWrap');
    if(!barrioWrap){
      barrioWrap = document.createElement('div');
      barrioWrap.id = 'neighborhoodWrap';
      barrioWrap.className = 'hidden';
      barrioWrap.innerHTML = `
        <label for="neighborhood">Barrio</label>
        <select id="neighborhood">
          <option value="">Seleccionar barrio</option>
          <option value="Caacupé">Caacupé</option>
          <option value="Lourdes">Lourdes</option>
          <option value="Mercedes">Mercedes</option>
          <option value="Fátima">Fátima</option>
        </select>
        <small>Disponible para residentes de Santa María de Fe.</small>`;
      select.closest('div')?.insertAdjacentElement('afterend', barrioWrap);
    }

    const barrio = document.getElementById('neighborhood');

    function isSantaMaria(){
      const selected = select.selectedOptions?.[0];
      return selected === santaMariaOption || String(selected?.value || '').startsWith('Santa María de Fe|');
    }

    function sync(){
      const selected = select.selectedOptions?.[0];
      const isOther = selected === otherOption;
      const isSM = isSantaMaria();

      other.classList.toggle('hidden', !isOther);
      other.required = isOther;

      barrioWrap.classList.toggle('hidden', !isSM);
      if(barrio) barrio.required = isSM;

      if(!isOther){
        other.value = '';
        otherOption.value = '__other__';
      } else {
        otherOption.value = other.value.trim() || '__other__';
        if(document.activeElement !== other) setTimeout(() => other.focus(), 0);
      }

      if(!isSM){
        santaMariaOption.value = 'Santa María de Fe';
        if(barrio) barrio.value = '';
      } else if(barrio?.value){
        santaMariaOption.value = `Santa María de Fe|${barrio.value}`;
      } else {
        santaMariaOption.value = 'Santa María de Fe';
      }
    }

    select.addEventListener('change', sync);
    other.addEventListener('input', () => {
      if(select.selectedOptions?.[0] === otherOption){
        otherOption.value = other.value.trim() || '__other__';
      }
    });
    barrio?.addEventListener('change', () => {
      if(isSantaMaria()) santaMariaOption.value = barrio.value ? `Santa María de Fe|${barrio.value}` : 'Santa María de Fe';
    });

    const start = document.getElementById('startBtn');
    start?.addEventListener('click', (event) => {
      if(select.selectedOptions?.[0] === otherOption){
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
      }

      if(isSantaMaria()){
        const value = barrio?.value || '';
        if(!value){
          event.preventDefault();
          event.stopImmediatePropagation();
          const msg = document.getElementById('registrationMsg');
          if(msg) msg.textContent = 'Seleccioná tu barrio.';
          barrio?.focus();
          return;
        }
        santaMariaOption.value = `Santa María de Fe|${value}`;
      }
    }, true);

    const newSim = document.getElementById('newSimulationBtn');
    newSim?.addEventListener('click', () => {
      setTimeout(() => {
        select.value = '';
        other.value = '';
        otherOption.value = '__other__';
        santaMariaOption.value = 'Santa María de Fe';
        other.classList.add('hidden');
        other.required = false;
        if(barrio) barrio.value = '';
        barrioWrap.classList.add('hidden');
        if(barrio) barrio.required = false;
      }, 0);
    });

    sync();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initResidence);
  else initResidence();
})();
