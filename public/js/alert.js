// type is ethier "success" or 'error'

export const hideAlert = () => {
  const el = document.querySelector('.alert');
  if (el) el.parentElement.removeChild(el);
};

export const showAlert = (type, msg) => {
  hideAlert();
  let markUp = `<div class="alert alert--${type}"> ${msg} </div>`;
  document.querySelector('body').insertAdjacentHTML('afterbegin', markUp);
  window.setTimeout(hideAlert, 3000);
};
