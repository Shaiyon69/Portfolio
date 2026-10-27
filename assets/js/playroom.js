// The Godot build is ~70 MB, so it only loads after the visitor asks for it.
document.addEventListener('DOMContentLoaded', () => {
    const start = document.getElementById('startGame');
    start.addEventListener('click', () => {
        const frame = document.createElement('iframe');
        frame.src = '/webvallaria/Convallaria.html';
        frame.title = 'Convallaria';
        frame.allow = 'autoplay; fullscreen; gamepad';
        frame.allowFullscreen = true;
        document.getElementById('gameStage').replaceChildren(frame);
        frame.focus();
    });
});
