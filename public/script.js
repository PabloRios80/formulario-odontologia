document.addEventListener('DOMContentLoaded', function() {
    
    // --- VARIABLES Y ELEMENTOS DEL DOM ---
    const prevBtn = document.getElementById('prev-step-btn');
    const nextBtn = document.getElementById('next-step-btn');
    const submitBtn = document.getElementById('submit-btn');
    const formSteps = document.querySelectorAll('.form-step');
    const progressBar = document.getElementById('progress-bar');
    
    let currentStep = 1;
    const totalSteps = 5; // Total de pasos que tendremos
    const SCRIPT_URL = "/guardar-odontologia";

    // --- FUNCIONES ---

    // Función para mostrar el paso correspondiente
    const showStep = (stepNumber) => {
        formSteps.forEach(step => step.classList.add('hidden'));
        document.getElementById(`step-${stepNumber}`).classList.remove('hidden');
        updateButtons();
        updateProgressBar();
    };

    // Función para actualizar la visibilidad de los botones
    const updateButtons = () => {
        prevBtn.classList.toggle('hidden', currentStep === 1);
        nextBtn.classList.toggle('hidden', currentStep === totalSteps);
        submitBtn.classList.toggle('hidden', currentStep !== totalSteps);
    };

    // Función para actualizar la barra de progreso
    const updateProgressBar = () => {
        const progress = (currentStep / totalSteps) * 100;
        progressBar.style.width = `${progress}%`;
    };
    
    // Función para establecer la fecha actual en el campo de fecha
    const setTodayDate = () => {
        const fechaInput = document.getElementById('fecha');
        if (fechaInput) {
            const today = new Date();
            fechaInput.value = today.toISOString().split('T')[0];
        }
    };

    // --- EVENT LISTENERS ---

    
nextBtn.addEventListener('click', () => {
    // --- INICIO DE LA VALIDACIÓN ---
    let isValid = true;
    const currentStepFields = document.querySelectorAll(`#step-${currentStep} [required]`);
    
    currentStepFields.forEach(field => {
        // Quita errores previos
        field.classList.remove('border-red-500');

        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('border-red-500'); // Pone un borde rojo si está vacío
        }
    });

    // Validación específica para el DNI en el paso 1
    if (currentStep === 1) {
        const dniInput = document.getElementById('dni');
        if (dniInput.value.length < 7 || dniInput.value.length > 8) {
            isValid = false;
            dniInput.classList.add('border-red-500');
            // Podríamos añadir un mensaje de error si quisiéramos
        }
    }

    if (!isValid) {
        alert("Por favor, completa todos los campos obligatorios.");
        return; // Detiene la función si algo no es válido
    }
    // --- FIN DE LA VALIDACIÓN ---


    if (currentStep < totalSteps) {
        currentStep++;
        showStep(currentStep);
    }
});

    prevBtn.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            showStep(currentStep);
        }
    });

    // --- LÓGICA DE ENVÍO DEL FORMULARIO ---
const form = document.getElementById('odontologia-form');

form.addEventListener('submit', function(e) {
  e.preventDefault(); // Evita que la página se recargue

  // Muestra un mensaje de "enviando"
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Guardando...';

    const formData = new FormData(form);

    fetch(SCRIPT_URL, {
    method: 'POST',
    body: formData
    })
    .then(response => response.json())
    .then(data => {
    if (data.result === "success") {
    alert("¡Registro guardado con éxito!");
      form.reset(); // Limpia el formulario
      currentStep = 1; // Vuelve al primer paso
    showStep(currentStep);
    } else {
    throw new Error(data.message || "Ocurrió un error desconocido.");
    }
    })
    .catch(error => {
    console.error('Error:', error);
    alert(`Error al guardar el registro: ${error.message}`);
    })
    .finally(() => {
    // Restaura el botón de guardar
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Guardar Registro';
    });
});

    // --- INICIALIZACIÓN ---
    const initForm = () => {
        console.log("Formulario cargado y listo.");
        setTodayDate();
        showStep(currentStep); // Mostramos el primer paso y ajustamos botones/progreso
    };

    initForm();

});