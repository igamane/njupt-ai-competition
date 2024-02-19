
// =============== property validation 1 =================== 
const form = document.getElementById('property-form');
const propertyNameV = document.getElementById('propertyName');
const propertyAddressV = document.getElementById('assistantInstructions');
const hostWhatsappV = document.getElementById('hostWhatsapp');
const models = document.querySelectorAll('input[name="model"]');
const select = document.getElementById('select-box');
const usageLimit = document.getElementById('usageLimit');

form.addEventListener('submit', e => { 

	const propertyNameValue = propertyNameV.value.trim();
	const propertyAddressValue = propertyAddressV.value.trim();
	const hostWhatsappValue = hostWhatsappV.value.trim();
	const usageLimitValue = usageLimit.value.trim();
	let modelSelected = false;
	models.forEach(radio => {
		if (radio.checked) {
			modelSelected = true;
		}
	});


	if (propertyNameValue === '') {
		setError(propertyNameV, 'Assistant name is a required field');
		e.preventDefault();
	} else {
		setSuccess(propertyNameV)
	}

	if (propertyAddressValue === '') {
		setError(propertyAddressV, 'Assistant Instructions is a required field');
		e.preventDefault();
	} else {
		setSuccess(propertyAddressV)
	}
	if (hostWhatsappValue === '') {
		setError(hostWhatsappV, 'Assistant description is a required field');
		e.preventDefault();
	} else {
		setSuccess(hostWhatsappV)
	}
	if (usageLimitValue === '') {
		setError(usageLimit, 'Usage limit is a required field');
		e.preventDefault();
	} else {
		setSuccess(usageLimit)
	}
	if (!modelSelected) {
		setModelError(select, 'Model is a required field');
		e.preventDefault();
	} else {
		setModelSuccess(select);
	}

});
// =============== property validation 2 =================== 
const editform = document.getElementById('edit-property-form');
const editpropertyNameV = document.getElementById('edit-propertyName');
const editpropertyAddressV = document.getElementById('edit-propertyAddress');
const edithostWhatsappV = document.getElementById('edit-hostWhatsapp');
const editusageLimit = document.getElementById('edit-usageLimit');

editform.addEventListener('submit', e => {

	const editpropertyNameValue = editpropertyNameV.value.trim();
	const editpropertyAddressValue = editpropertyAddressV.value.trim();
	const edithostWhatsappValue = edithostWhatsappV.value.trim();
	const editusageLimitValue = editusageLimit.value.trim();


	if (editpropertyNameValue === '') {
		setError(editpropertyNameV, 'Chat name is a required field');
		e.preventDefault();
	} else {
		setSuccess(editpropertyNameV)
	}

	if (editpropertyAddressValue === '') {
		setError(editpropertyAddressV, 'Chat prompt is a required field');
		e.preventDefault();
	} else {
		setSuccess(editpropertyAddressV)
	}
	if (edithostWhatsappValue === '') {
		setError(edithostWhatsappV, 'Chat description is a required field');
		e.preventDefault();
	} else {
		setSuccess(edithostWhatsappV)
	}
	if (editusageLimitValue === '') {
		setError(editusageLimit, 'Usage limit is a required field');
		e.preventDefault();
	} else {
		setSuccess(editusageLimit)
	}

});

const setError = (element, message) => {
	const inputControl = element.parentElement.parentElement;
	const errorDisplay = inputControl.querySelector('.errormessage');

	errorDisplay.innerText = message;
	inputControl.classList.add('error');
}
const setSuccess = element => {
	const inputControl = element.parentElement.parentElement;
	const errorDisplay = inputControl.querySelector('.errormessage');

	errorDisplay.innerText = '';
	inputControl.classList.remove('error');
};
const setModelError = (element, message) => {
	const inputControl = element.parentElement;
	const errorDisplay = inputControl.querySelector('.errormessage');

	errorDisplay.innerText = message;
	inputControl.classList.add('error');
}
const setModelSuccess = element => {
	const inputControl = element.parentElement;
	const errorDisplay = inputControl.querySelector('.errormessage');

	errorDisplay.innerText = '';
	inputControl.classList.remove('error');
};


const isValidEmail = email => {
	const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return re.test(String(email).toLowerCase());
}