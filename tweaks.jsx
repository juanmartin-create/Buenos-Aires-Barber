/* Tweaks for index.html — drives the existing vanilla DOM from a small React app. */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#c9a96a",
  "giftTagline": "No regalás un corte, regalás una experiencia.",
  "showTagline": true,
  "showFab": true,
  "fabText": "Regalá una Experiencia",
  "drinkNote": "Cada servicio incluye una bebida de cortesía — café Segafredo, cerveza o Whisky."
}/*EDITMODE-END*/;

function applyTweaks(t) {
  const root = document.documentElement;
  if (t.accent) {
    root.style.setProperty('--gold', t.accent);
    root.style.setProperty('--gold-2', t.accent);
  }
  const tag = document.getElementById('giftTagline');
  if (tag) {
    tag.textContent = t.giftTagline;
    tag.style.display = t.showTagline ? '' : 'none';
  }
  const fab = document.querySelector('.gift-fab');
  if (fab) fab.style.display = t.showFab ? '' : 'none';
  const fabTitle = document.querySelector('.gift-fab-title');
  if (fabTitle) fabTitle.textContent = t.fabText;
  const note = document.querySelector('.services-note');
  if (note) note.textContent = t.drinkNote;
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  React.useEffect(() => { applyTweaks(t); }, [t]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Gift Card" />
      <TweakText label="Frase del hero" value={t.giftTagline} onChange={(v) => setTweak('giftTagline', v)} />
      <TweakToggle label="Mostrar frase" value={t.showTagline} onChange={(v) => setTweak('showTagline', v)} />
      <TweakToggle label="Tarjeta flotante" value={t.showFab} onChange={(v) => setTweak('showFab', v)} />
      <TweakText label="Texto tarjeta flotante" value={t.fabText} onChange={(v) => setTweak('fabText', v)} />

      <TweakSection label="Estilo" />
      <TweakColor label="Acento dorado" value={t.accent}
                  options={['#c9a96a', '#d8a85a', '#e0b878', '#b0884a']}
                  onChange={(v) => setTweak('accent', v)} />

      <TweakSection label="Servicios" />
      <TweakText label="Bebida de cortesía" value={t.drinkNote} onChange={(v) => setTweak('drinkNote', v)} />
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById('tweaks-root')).render(<App />);
