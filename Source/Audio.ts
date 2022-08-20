namespace Tsentris {
  let audio: { [key: string]: ƒ.Audio } = {};
  let combo: ƒ.Audio[] = [];
  let cmpEffect: ƒ.ComponentAudio;
  let cmpCombo: ƒ.ComponentAudio;

  export function audioInit() {
    let cmpListener = new ƒ.ComponentAudioListener();
    game.addComponent(cmpListener);
    ƒ.AudioManager.default.listenWith(cmpListener);
    ƒ.AudioManager.default.listenTo(game);

    let paths: { [key: string]: string } = {
      music: "Music.mp3",
      translate: "Translate.mp3", rotate: "Rotate.mp3",
      drop: "Drop.mp3", nodrop: "Nodrop.mp3",
      collision: "Collision.mp3"
    };

    for (let key in paths)
      audio[key] = new ƒ.Audio("Audio/" + paths[key]);
    for (let iCombo: number = 1; iCombo < 8; iCombo++)
      combo[iCombo] = new ƒ.Audio("Audio/Combo0" + iCombo + ".mp3");

    cmpEffect = new ƒ.ComponentAudio();
    game.addComponent(cmpEffect);
    cmpCombo = new ƒ.ComponentAudio();
    game.addComponent(cmpCombo);
  }

  export function audioStartMusic() {
    let cmpMusic: ƒ.ComponentAudio = new ƒ.ComponentAudio(audio.music, true, true);
    game.addComponent(cmpMusic);
  }

  export function audioEffect(_effect: string) {
    let a: ƒ.Audio = audio[_effect];
    if (!a)
      return;
    cmpEffect.setAudio(a);
    cmpEffect.play(true);
  }

  export function audioCombo(_iCombo: number) {
    let a: ƒ.Audio = combo[_iCombo];
    if (!a)
      return;
    cmpCombo.setAudio(a);
    cmpCombo.play(true);
  }
}