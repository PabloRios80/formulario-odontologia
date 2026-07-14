document.addEventListener("DOMContentLoaded", function () {
  // --- VARIABLES Y ELEMENTOS DEL DOM ---
  const prevBtn = document.getElementById("prev-step-btn");
  const nextBtn = document.getElementById("next-step-btn");
  const submitBtn = document.getElementById("submit-btn");
  const formSteps = document.querySelectorAll(".form-step");
  const progressBar = document.getElementById("progress-bar");

  let currentStep = 1;
  const totalSteps = 5; // Total de pasos que tendremos
  const SCRIPT_URL = "/guardar-odontologia";

  // --- FUNCIONES ---

  // Función para mostrar el paso correspondiente
  const showStep = (stepNumber) => {
    formSteps.forEach((step) => step.classList.add("hidden"));
    document.getElementById(`step-${stepNumber}`).classList.remove("hidden");
    updateButtons();
    updateProgressBar();
  };

  // Función para actualizar la visibilidad de los botones
  const updateButtons = () => {
    prevBtn.classList.toggle("hidden", currentStep === 1);
    nextBtn.classList.toggle("hidden", currentStep === totalSteps);
    submitBtn.classList.toggle("hidden", currentStep !== totalSteps);
  };

  // Función para actualizar la barra de progreso
  const updateProgressBar = () => {
    const progress = (currentStep / totalSteps) * 100;
    progressBar.style.width = `${progress}%`;
  };

  // Función para establecer la fecha actual en el campo de fecha
  const setTodayDate = () => {
    const fechaInput = document.getElementById("fecha");
    if (fechaInput) {
      const today = new Date();
      fechaInput.value = today.toISOString().split("T")[0];
    }
  };

  // --- EVENT LISTENERS ---

  nextBtn.addEventListener("click", () => {
    // --- INICIO DE LA VALIDACIÓN ---
    let isValid = true;
    const currentStepFields = document.querySelectorAll(
      `#step-${currentStep} [required]`,
    );

    currentStepFields.forEach((field) => {
      // Quita errores previos
      field.classList.remove("border-red-500");

      if (!field.value.trim()) {
        isValid = false;
        field.classList.add("border-red-500"); // Pone un borde rojo si está vacío
      }
    });

    // Validación específica para el DNI en el paso 1
    if (currentStep === 1) {
      const dniInput = document.getElementById("dni");
      if (dniInput.value.length < 7 || dniInput.value.length > 8) {
        isValid = false;
        dniInput.classList.add("border-red-500");
        // Podríamos añadir un mensaje de error si quisiéramos
      }
    }
    // Validación piezas dentales (solo en paso 3)
    if (currentStep === 3) {
      const camposPiezas = [
        "piezas-cariadas",
        "piezas-perdidas",
        "piezas-obturadas",
      ];
      camposPiezas.forEach((id) => {
        const campo = document.getElementById(id);
        const val = campo.value.trim();
        if (val !== "") {
          const num = parseInt(val);
          if (isNaN(num) || num < 0 || num > 32) {
            isValid = false;
            campo.classList.add("border-red-500");
          }
        }
      });
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

  prevBtn.addEventListener("click", () => {
    if (currentStep > 1) {
      currentStep--;
      showStep(currentStep);
    }
  });

  // --- LÓGICA DE ENVÍO DEL FORMULARIO ---
  const form = document.getElementById("odontologia-form");

  form.addEventListener("submit", function (e) {
    e.preventDefault(); // Evita que la página se recargue

    // Muestra un mensaje de "enviando"
    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin mr-2"></i>Guardando...';

    const formData = new FormData(form);

    fetch(SCRIPT_URL, {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.result === "success") {
          mostrarSeccionPracticasOdontologia(
            document.getElementById("dni").value.trim(),
          );
        } else {
          throw new Error(data.message || "Ocurrió un error desconocido.");
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        alert(`Error al guardar el registro: ${error.message}`);
      })
      .finally(() => {
        // Restaura el botón de guardar
        submitBtn.disabled = false;
        submitBtn.innerHTML =
          '<i class="fas fa-save mr-2"></i>Guardar Registro';
      });
  });

  // ── VERIFICAR DNI + ALERTAS ODONTOLOGÍA ──
  const dniInput = document.getElementById("dni");
  dniInput.addEventListener("blur", async function () {
    const dni = this.value.trim();
    if (!/^[a-zA-Z]?\d{6,8}$/.test(dni)) return;

    // Mensaje de verificación
    let msgEl = document.getElementById("dniMsg");
    if (!msgEl) {
      msgEl = document.createElement("div");
      msgEl.id = "dniMsg";
      msgEl.style.cssText =
        "margin-top:8px; padding:10px 14px; border-radius:8px; font-size:13px; font-weight:500;";
      dniInput.parentNode.appendChild(msgEl);
    }
    msgEl.style.cssText +=
      "background:#f8fafc; color:#64748b; border:1px solid #e2e8f0;";
    msgEl.innerHTML =
      '<i class="fas fa-spinner fa-spin" style="margin-right:6px"></i>Verificando afiliación...';

    try {
      // 1. Verificar IAPOS
      const res = await fetch("/verificar-afiliado/" + dni);
      const data = await res.json();

      if (!data.esActivo) {
        msgEl.style.cssText =
          "margin-top:8px; padding:10px 14px; border-radius:8px; font-size:13px; font-weight:500; background:#fef2f2; color:#dc2626; border:1px solid #fecaca;";
        msgEl.innerHTML =
          '<i class="fas fa-times-circle" style="margin-right:6px"></i>DNI no corresponde a un afiliado activo de IAPOS.';
        return;
      }

      msgEl.style.cssText =
        "margin-top:8px; padding:10px 14px; border-radius:8px; font-size:13px; font-weight:500; background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0;";
      msgEl.innerHTML =
        '<i class="fas fa-check-circle" style="margin-right:6px"></i>Afiliado activo — ' +
        (data.nombre || "") +
        (data.localidad ? " · " + data.localidad : "");

      // Autocompletar apellido y nombre
      if (data.nombre) {
        const partes = data.nombre.trim().split(",");
        if (partes.length >= 2) {
          if (!document.getElementById("apellido").value)
            document.getElementById("apellido").value = partes[0].trim();
          if (!document.getElementById("nombre").value)
            document.getElementById("nombre").value = partes[1].trim();
        }
      }
      if (data.edad) document.getElementById("edad").value = data.edad;
      if (data.sexo)
        document.getElementById("sexo").value =
          data.sexo === "2" ? "Femenino" : "Masculino";

      // 2. Cargar alertas clínicas relevantes para odontología
      const alertasRes = await fetch("/cargar-datos-paciente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni }),
      });
      const alertasData = await alertasRes.json();

      const camposOdonto = [
        "Control_odontologico",
        "Tabaco",
        "Diabetes",
        "Presion_Arterial",
      ];
      const alertasOdonto = (alertasData.alertas || []).filter(
        (a) => camposOdonto.includes(a.campo) || !a.campo,
      );

      if (alertasOdonto.length > 0) {
        let alertaBox = document.getElementById("alertas-odonto");
        if (!alertaBox) {
          alertaBox = document.createElement("div");
          alertaBox.id = "alertas-odonto";
          alertaBox.style.cssText =
            "margin-top:12px; border-radius:8px; overflow:hidden;";
          msgEl.parentNode.appendChild(alertaBox);
        }
        let html =
          '<div style="background:#fffbeb; border-left:4px solid #d97706; padding:10px 14px;">';
        html +=
          '<p style="font-size:12px; font-weight:700; color:#92400e; margin-bottom:6px;"><i class="fas fa-exclamation-triangle" style="margin-right:6px"></i>Alertas clínicas relevantes:</p>';
        alertasOdonto.forEach((a) => {
          const color =
            a.tipo === "URGENTE"
              ? "#dc2626"
              : a.tipo === "RIESGO"
                ? "#d97706"
                : "#0448a2";
          html += `<p style="font-size:12px; color:${color}; margin:3px 0;">${a.mensaje}</p>`;
        });
        html += "</div>";
        alertaBox.innerHTML = html;
      }
    } catch (e) {
      msgEl.style.cssText =
        "margin-top:8px; padding:10px 14px; border-radius:8px; font-size:13px; font-weight:500; background:#fffbeb; color:#d97706; border:1px solid #fde68a;";
      msgEl.innerHTML =
        '<i class="fas fa-exclamation-triangle" style="margin-right:6px"></i>No se pudo verificar. Continuá o consultá a IAPOS.';
    }
  });

  const initForm = () => {
    console.log("Formulario cargado y listo.");
    setTodayDate();
    // Setear profesional desde JWT
    const odontologoInput = document.getElementById("odontologo");
    if (window.dpProfesional && odontologoInput) {
      odontologoInput.value = window.dpProfesional;
      odontologoInput.setAttribute("readonly", true);
      odontologoInput.classList.add("bg-gray-100");
    }
    showStep(currentStep);
  };
  function mostrarSeccionPracticasOdontologia(dni) {
  let seccion = document.getElementById('seccion-practicas-odonto');
  if (!seccion) {
    seccion = document.createElement('div');
    seccion.id = 'seccion-practicas-odonto';
    seccion.style.cssText = 'margin-top:24px; background:white; border-radius:12px; padding:20px; border:2px solid #ea580c;';
    document.querySelector('main .container').appendChild(seccion);
  }
  seccion.innerHTML = `
    <h3 style="font-size:15px; font-weight:700; color:#9a3412; margin-bottom:12px;">
      <i class="fas fa-tooth" style="margin-right:6px"></i>Prácticas adicionales realizadas
    </h3>
    <p style="font-size:12px; color:#78716c; margin-bottom:14px;">Marcá si además de la consulta se realizó:</p>
    <div style="display:flex; gap:12px; flex-wrap:wrap;">
      <button onclick="marcarPracticaOdonto('ens', 'Enseñanza técnica H.O.', this)"
        style="font-size:13px; padding:10px 18px; border-radius:20px; font-weight:700; border:2px solid #ea580c; cursor:pointer; background:#fff7ed; color:#9a3412;">
        Enseñanza técnica H.O.
      </button>
      <button onclick="marcarPracticaOdonto('fluor', 'Topicación con flúor', this)"
        style="font-size:13px; padding:10px 18px; border-radius:20px; font-weight:700; border:2px solid #ea580c; cursor:pointer; background:#fff7ed; color:#9a3412;">
        Topicación con flúor
      </button>
    </div>
    <p id="msg-practica-odonto" style="font-size:12px; margin-top:10px;"></p>
  `;
  seccion.dataset.dni = dni;
  seccion.scrollIntoView({ behavior: 'smooth' });
}

async function marcarPracticaOdonto(codigo, etiqueta, btn) {
  const dni = document.getElementById('seccion-practicas-odonto').dataset.dni;
  btn.disabled = true;
  const original = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  try {
    const res = await fetch('https://tablero-dia.onrender.com/api/marcar-practica-odontologia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dni, codigo })
    });
    const data = await res.json();
    if (data.success) {
      btn.style.background = '#dcfce7';
      btn.style.borderColor = '#16a34a';
      btn.style.color = '#15803d';
      btn.innerHTML = '✓ ' + etiqueta;
    } else {
      throw new Error(data.message || 'Error al guardar');
    }
  } catch (e) {
    document.getElementById('msg-practica-odonto').innerHTML =
      `<span style="color:#dc2626">Error: ${e.message}</span>`;
    btn.disabled = false;
    btn.innerHTML = original;
  }
}
  initForm();
});
