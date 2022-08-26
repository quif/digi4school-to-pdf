import { modalCss } from './modal.css';

export const modalHtml = /*html*/ `
${modalCss}

<div class="modal-content">
  <div class="header">
    <img src="https://cdn.digi4school.at/img/d4s_logo.png">
    <span style="padding-left: 5px">to PDF</span>
  </div>

  <div class="content row">

    <div class="input-field col s12">
      <select id="save-method-select">
        <option value="png">Als PNG (Rasterisiert)</option>
        <option value="vector" selected>Vektorgrafik (Hochauflösend)</option>
      </select>
      <label>Speichermethode</label>
    </div>

    <div class="col s1"></div>

    <div id="png-info" class="col s11" style="display: none">
      <p class="range-field">
        <label>Skalierung: <span id="scale-display">0.75</span>x</label>
        <input type="range" id="scale" min="1" max="16" value="4" />
      </p>
      <p>Achtung: Je höher die Auflösung ist, desto länger braucht der Vorgang und die Ergebnis-PDF verbraucht mehr
        Speicherplatz.</p>
    </div>

    <p class="col s11" id="vector-info">Achtung: Manche Bilder können nicht gespeichert werden.</p>

    <div class="row">
      <div class="input-field col s6">
        <input id="from-page" type="text">
        <label for="from-page">Ab Seite</label>
      </div>

      <div class="input-field col s6">
        <input id="to-page" type="text">
        <label for="to-page">Bis Seite</label>
      </div>
    </div>

    <span style="display: none" id="page-error" class="d4s2pdf-error">Ungültiger Seitenbereich</span>
  </div>
</div>

<div class="modal-footer">
  <button id="button-close" class="modal-close waves-effect waves-green btn">Abbrechen</button>
  <button id="button-convert" class="waves-effect waves-green btn btn-d4s2pdf">Konvertieren</button>
</div>
`;
