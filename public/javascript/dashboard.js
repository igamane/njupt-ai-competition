// toggle nav bar
const bar = document.querySelector('.menu-toggle');
const sidebar = document.querySelector('.dashboard-sidebar');
const main = document.querySelector('.dashboard-main')
const overlay = document.querySelector('.overlay')

bar.addEventListener('click', () => {
    sidebar.classList.toggle('hide-sidebar');
    main.classList.toggle('extand-main');
    overlay.classList.toggle('show-overlay');
})
overlay.addEventListener('click', () => {
    sidebar.classList.remove('hide-sidebar');
    overlay.classList.remove('show-overlay')
})

// show modale
const modalButton = document.querySelectorAll('.modul-button');
const closemodal = document.querySelector('.modal__close');
const modal = document.querySelector('.modal__container');
const overlayr = document.querySelector('.modal-overlay');
const imgArea = document.querySelector('.img-area');

function deleteImages() {
    var image = imgArea.querySelector("img");
    if (image) {
        imgArea.removeChild(image);
    }
}

modalButton.forEach(b => {
    b.addEventListener('click', function () {
        modal.classList.add('show-modal');
        overlayr.classList.add('show-modal-overlay');
    })
})
overlayr.addEventListener('click', () => {
    modal.classList.remove('show-modal');
    overlayr.classList.remove('show-modal-overlay')
    deleteImages();
})
closemodal.addEventListener('click', function () {
    modal.classList.remove('show-modal');
    overlayr.classList.remove('show-modal-overlay');
    deleteImages();
})

