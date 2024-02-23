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

// ========= Image upload ==========

const inputFile = document.querySelector('#propertyPhoto');

imgArea.addEventListener('click', function () {
    inputFile.click();
})


inputFile.addEventListener('change', function () {
    const image = this.files[0]
    if (image.size < 10000000) {
        const reader = new FileReader();
        reader.onload = () => {
            const allImg = imgArea.querySelectorAll('img');
            allImg.forEach(item => item.remove());
            const imgUrl = reader.result;
            const img = document.createElement('img');
            img.src = imgUrl;
            imgArea.appendChild(img);
            imgArea.classList.add('active');
            imgArea.dataset.img = image.name;
        }
        reader.readAsDataURL(image);
    } else {
        alert("The image size is more than 10MB");
    }
})

// ======== file upload ==============
let fileInput = document.getElementById("additionalFiles");
let fileList = document.getElementById("files-list");
let numOfFiles = document.querySelector(".num-of-files");

fileInput.addEventListener("change", () => {
    fileList.innerHTML = "";
    if (fileInput.files.length == 0) {
        numOfFiles.textContent = `No Files Chosen`;
    } else {
        numOfFiles.textContent = `File Selected`;
    }

    for (let i of fileInput.files) {
        let reader = new FileReader();
        let listItem = document.createElement("li");
        let fileName = i.name;
        let fileSize = (i.size / 1024).toFixed(1);
        listItem.innerHTML = `<p>${fileName}</p><p>${fileSize}KB</p>`;

        if (fileSize >= 1024) {
            fileSize = (fileSize / 1024).toFixed(1);
            listItem.innerHTML = `<p>${fileName}</p><p>${fileSize}MB</p>`;
        }

        fileList.appendChild(listItem);
    }
});
// =============== image modal ====================
const propertyItem = document.querySelectorAll('.property-item');
// show modale
const editModalButton = document.querySelectorAll('.edit_modul-button');
const editClosemodal = document.querySelector('.edit_modal__close');
const editModal = document.querySelector('.edit_modal__container');
const editOverlayr = document.querySelector('.edit_modal-overlay');
const editImgArea = document.querySelector('.edit_img-area');
const editInputFile = document.querySelector('#edit_propertyPhoto');

editImgArea.addEventListener('click', function () {
    editInputFile.click();
})

editInputFile.addEventListener('change', function () {
    const image = this.files[0]
    if (image.size < 10000000) {
        const reader = new FileReader();
        reader.onload = () => {
            const allImg = editImgArea.querySelectorAll('img');
            allImg.forEach(item => item.remove());
            const imgUrl = reader.result;
            const img = document.createElement('img');
            img.src = imgUrl;
            editImgArea.appendChild(img);
            editImgArea.classList.add('active');
            editImgArea.dataset.img = image.name;
        }
        reader.readAsDataURL(image);
    } else {
        alert("The image size is more than 10MB");
    }
})

// ===== form elements =====
let editForm = editModal.querySelector('#edit-property-form');
let propertyName = editModal.querySelector('#edit-propertyName');
let propertyAddress = editModal.querySelector('#edit-propertyAddress');
let hostWhatsapp = editModal.querySelector('#edit-hostWhatsapp');
let cleaningContactWhatsapp = editModal.querySelector('#edit-cleaningContactWhatsapp');
let emergencyContactWhatsapp = editModal.querySelector('#edit-emergencyContactWhatsapp');
let propertyFileCode = editModal.querySelector('#edit-propertyFileCode');
let fileCodeContainer = editModal.querySelector('.error-container.none');

function deleteImage() {
    var image = editImgArea.querySelector("img");
    if (image) {
        editImgArea.removeChild(image);
    }
}

editModalButton.forEach(b => {
    b.addEventListener('click', function () {
        editModal.classList.add('show-modal');
        editOverlayr.classList.add('show-modal-overlay');
    })
})
editOverlayr.addEventListener('click', () => {
    editModal.classList.remove('show-modal');
    editOverlayr.classList.remove('show-modal-overlay')
    deleteImage();
})
editClosemodal.addEventListener('click', function () {
    editModal.classList.remove('show-modal');
    editOverlayr.classList.remove('show-modal-overlay');
    deleteImage();
})

// ======= copy button ===========
document.getElementById('copyButton').addEventListener('click', function () {
    // Use previousElementSibling to get the input field related to the clicked span
    const inputField = this.previousElementSibling;

    // Since the input field is disabled, we need to temporarily enable it to select the text
    inputField.disabled = false;

    // Select the text inside the input field
    inputField.select();
    inputField.setSelectionRange(0, 99999); // For mobile devices

    // Execute the copy command
    try {
        const successful = document.execCommand('copy');
        const msg = successful ? 'successfully' : 'unsuccessfully';
        console.log(`Copying text command was ${msg}.`);
    } catch (err) {
        console.log('Oops, unable to copy');
    }

    // Re-disable the input field if needed
    inputField.disabled = true;
});

// ============== select ==============
const selected = document.querySelector('.selected');
const selectedP = document.querySelector('.selected p');
const optionsContainer = document.querySelector('.options-container');
const options = document.querySelectorAll('.option label')

selected.addEventListener('click', () => {
	optionsContainer.classList.toggle('activec');
})

options.forEach(o => {
	o.addEventListener('click', () => {
		selectedP.innerHTML = o.innerHTML;
		optionsContainer.classList.remove('activec');
	})
})
// ============== select ==============
const selected2 = document.querySelector('.selected2');
const selectedP2 = document.querySelector('.selected2 p');
const optionsContainer2 = document.querySelector('.options-container2');
const options2 = document.querySelectorAll('.option2 label')

selected2.addEventListener('click', () => {
	optionsContainer2.classList.toggle('activec');
})

options2.forEach(o => {
	o.addEventListener('click', () => {
		selectedP2.innerHTML = o.innerHTML;
		optionsContainer2.classList.remove('activec');
	})
})

 

// const form = document.querySelector('.image-form');
// const loading = document.querySelector('.loading');
// const progress = document.querySelector('progress');
// const percentage = document.querySelector('.progress-indicator');

// let load = 0;
// let proce;

// let upload = () => {
// 	if (load !== 93) {
// 		load = load + 3;
// 		progress.value = load;
// 		percentage.innerHTML = '.. (%' + load + ')'
// 	} else {
// 		clearInterval(proce);
// 	}
// }
// let startLoading = () => {
// 	if (load < 35) {
// 		proce = setInterval(upload, 1000)
// 	}
// 	setTimeout(() => {
// 		if (load < 60) {
// 			clearInterval(proce);
// 			proce = setInterval(upload, 3000)
// 		}
// 		setTimeout(() => {
// 			if (load < 80) {
// 				clearInterval(proce);
// 				proce = setInterval(upload, 4000)
// 			}
// 			setTimeout(() => {
// 				if (load < 94) {
// 					clearInterval(proce);
// 					proce = setInterval(upload, 8000)
// 				}
// 			}, 27000)
// 		}, 24000)
// 	}, 12000)
// }

// form.addEventListener('submit', () => {
// 	loading.classList.remove('hidden');
// 	startLoading();
// })