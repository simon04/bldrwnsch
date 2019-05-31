import Overlay from 'ol/Overlay';

const container = document.getElementById('popup');
const content = document.getElementById('popup-content');
const closer = document.getElementById('popup-closer');

export const popupOverlay = new Overlay({
  element: container
});

closer.onclick = function() {
  popupOverlay.setPosition(undefined);
  closer.blur();
  return false;
};

export function setPopupContent(html) {
  content.innerText = html;
}
export function setPopupPosition(coordinate) {
  popupOverlay.setPosition(coordinate);
}
