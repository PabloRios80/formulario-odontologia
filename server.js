require("dotenv").config();
const express = require("express");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");
const multer = require("multer");
const upload = multer();

const app = express();
const PORT = process.env.PORT || 3004;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  req.setEncoding("utf8");
  next();
});
app.use((req, res, next) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  next();
});
app.use(express.static(path.join(__dirname, "public")));

// ── GUARDAR ODONTOLOGÍA ──
app.post("/guardar-odontologia", upload.none(), async (req, res) => {
  const data = req.body;
  console.log(
    "RIESGO recibido:",
    JSON.stringify(Object.keys(data).filter((k) => k.includes("RIESGO"))),
  );
  console.log(
    "VALOR RIESGO:",
    data["RIESGO - Evaluación General"],
    "||",
    data["RIESGO - EvaluaciÃ³n General"],
  );
  console.log("Datos recibidos:", data);

  try {
    const { data: insertado, error } = await supabase
      .from("odontologia_consultas")
      .insert({
        odontologo: data.Odontologo,
        fecha: data.Fecha,
        dni: data.DNI,
        id_sede_dp: data.id_sede_dp ? parseInt(data.id_sede_dp) : null,
        apellido: data.Apellido,
        nombre: data.Nombre,
        edad: data.Edad,
        sexo: data.Sexo,
        fuma: data.Fuma,
        patologias: data.Patologias,
        medicacion: data.Medicacion,
        alergias: data.Alergias,
        examen_extraoral: data["Examen extraoral"],
        examen_intraoral: data["Examen intraoral"],
        protesis_removibles:
          data["Utiliza prótesis removibles"] ||
          data["Utiliza prÃ³tesis removibles"],
        piezas_cariadas: data["Piezas cariada"],
        piezas_perdidas: data["Piezas perdidas"],
        piezas_obturadas: data["Piezas obturadas"],
        dieta_azucar:
          data["Dieta, momentos de azúcar"] ||
          data["Dieta, momentos de azÃºcar"],
        higiene_bucal: data["Higiene Bucal placa a simple vista"],
        antecedentes_cancer_oral:
          data["Antecedentes de cáncer oral"] ||
          data["Antecedentes de cÃ¡ncer oral"],
        necesidad_implantes:
          data["Necesidad de implantes o prótesis"] ||
          data["Necesidad de implantes o prÃ³tesis"],
        ortodoncia: data.Ortodoncia,
        controles_odontologicos:
          data["Controles odontológicos"] || data["Controles odontolÃ³gicos"],
        riesgo_evaluacion:
          data["RIESGO - Evaluación General"] ||
          data["RIESGO - EvaluaciÃ³n General"],
        conformidad_cobertura:
          data["Conformidad con cobertura de su Obra Social"],
        observaciones: data.Observaciones,
      })
      .select()
      .single();

    if (error) {
      console.error("Error Supabase:", error);
    } else {
      console.log("✅ Odontología guardada en Supabase para DNI:", data.DNI);
    }
    // ── Auto-actualizar tablero del día + registrar consulta como práctica facturable ──
    try {
      const hoy = new Date().toISOString().split("T")[0];

      const { data: registroTablero } = await supabase
        .from("tablero_dia")
        .select("id")
        .eq("dni", data.DNI)
        .gte("fecha", hoy)
        .lte("fecha", hoy)
        .maybeSingle();

      if (registroTablero) {
        await supabase
          .from("tablero_dia")
          .update({ odon_consulta: true })
          .eq("id", registroTablero.id);
      }

      // Evitar duplicar la práctica si ya se guardó una consulta hoy para este DNI
      const { data: yaExiste } = await supabase
        .from("practicas_autorizadas")
        .select("id")
        .eq("dni", data.DNI)
        .eq("descripcion_practica", "Consulta odontológica")
        .eq("fecha_autorizacion", hoy)
        .maybeSingle();

      if (!yaExiste) {
        await supabase.from("practicas_autorizadas").insert({
          dni: data.DNI,
          descripcion_practica: "Consulta odontológica",
          estado: "REALIZADA",
          fecha_carga: hoy,
          fecha_autorizacion: hoy,
          indicacion_entregada: true,
          nombre_completo: "",
        });
      }
    } catch (e) {
      console.warn(
        "No se pudo actualizar tablero/practica odontología:",
        e.message,
      );
    }

    // Enviar a Apps Script para generar PDF y capturar el link
    try {
      const dataParaAppsScript = {
        ...data,
        "RIESGO - Evaluación General":
          data["RIESGO - Evaluación General"] ||
          data["RIESGO - EvaluaciÃ³n General"],
      };
      const formData = new URLSearchParams(dataParaAppsScript).toString();
      const appsResponse = await axios.post(
        process.env.APPS_SCRIPT_URL,
        formData,
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        },
      );

      const pdfLink = appsResponse.data?.pdfLink || null;
      console.log("PDF Link recibido:", pdfLink);

      if (pdfLink && insertado?.id) {
        const { error: updateError } = await supabase
          .from("odontologia_consultas")
          .update({ enlace_pdf: pdfLink })
          .eq("id", insertado.id);

        if (updateError)
          console.error("Error actualizando PDF link:", updateError);
        else console.log("✅ PDF link guardado en Supabase");
      }
    } catch (e) {
      console.error("Error Apps Script:", e.message);
    }

    res.json({ result: "success" });
  } catch (e) {
    console.error("Error:", e.message);
    res.status(500).json({ result: "error", message: e.message });
  }
});

// ── VERIFICAR AFILIADO IAPOS ──
app.get("/verificar-afiliado/:dni", async (req, res) => {
  const dni = req.params.dni;
  const hoy = new Date().toISOString().split("T")[0];

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
            <BEWsValidaAfi.Execute xmlns="IAPOS_WS">
                <Usuario>CONSULTAPDP</Usuario>
                <Passwd>1Qaz</Passwd>
                <Nafiliado>${dni}</Nafiliado>
                <Badocnumdo>${dni}</Badocnumdo>
                <Tidocodigo_de_documento>96</Tidocodigo_de_documento>
                <Ogorcodigo>1</Ogorcodigo>
                <Fechpresta>${hoy}</Fechpresta>
            </BEWsValidaAfi.Execute>
        </soap:Body>
    </soap:Envelope>`;

  try {
    const iaposRes = await axios.post(
      "https://aswe.santafe.gov.ar/iapos-sw-srvt/servlet/abewsvalidaafi",
      soapBody,
      {
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: "IAPOS_WSaction/ABEWSVALIDAAFI.Execute",
        },
        timeout: 10000,
      },
    );
    const xml = iaposRes.data;
    const getValor = (tag) => {
      const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]+)<\/${tag}>`));
      return match ? match[1].trim() : null;
    };
    res.json({
      esActivo: getValor("Estado") === "A",
      nombre: getValor("Apenom"),
      edad: getValor("Edad"),
      sexo: getValor("Sexo"),
      localidad: getValor("Localidad"),
      fechaNac: getValor("Fechanac"),
    });
  } catch (e) {
    console.error("Error IAPOS:", e.message);
    res.json({ esActivo: false, nombre: null });
  }
});

// ── CARGAR DATOS PACIENTE + ALERTAS ──
app.post("/cargar-datos-paciente", async (req, res) => {
  const { dni } = req.body;
  if (!dni) return res.status(400).json({ error: "DNI requerido." });

  const { data: afiliado } = await supabase
    .from("afiliados")
    .select("*")
    .eq("dni", dni)
    .single();

  const { data: ultimoDP } = await supabase
    .from("historial_dia_preventivo")
    .select(
      "fechax, cancer_cervico_hpv, somf, dislipemias, diabetes, presion_arterial",
    )
    .eq("dni", dni)
    .order("fechax", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: enfermeria } = await supabase
    .from("enfermeria_consultas")
    .select("presion_arterial, peso_kg, altura_cm")
    .eq("dni", dni)
    .order("fecha_cierre_enf", { ascending: false })
    .limit(1)
    .maybeSingle();

  const alertas = [];

  if (afiliado?.hipertension === "si")
    alertas.push({
      tipo: "RIESGO",
      campo: "Presion_Arterial",
      mensaje: "⚠️ Declara hipertensión en hoja de vida",
    });
  if (afiliado?.diabetes === "si")
    alertas.push({
      tipo: "RIESGO",
      campo: "Diabetes",
      mensaje: "⚠️ Declara diabetes en hoja de vida",
    });
  if (afiliado?.fuma && afiliado.fuma !== "nunca")
    alertas.push({
      tipo: "INFO",
      campo: "Tabaco",
      mensaje: `ℹ️ Fumador declarado: ${afiliado.fuma}`,
    });
  if (afiliado?.cancer_de_colon === "si")
    alertas.push({
      tipo: "RIESGO",
      campo: "Control_odontologico",
      mensaje: "⚠️ Antecedente familiar de cáncer — mayor riesgo cáncer oral",
    });
  if (afiliado?.depresion === "si")
    alertas.push({
      tipo: "INFO",
      campo: "Control_odontologico",
      mensaje: "ℹ️ Declara depresión — posible bruxismo o descuido bucal",
    });

  if (enfermeria?.presion_arterial) {
    const partes = enfermeria.presion_arterial.split("/");
    if (partes.length === 2) {
      const sist = parseInt(partes[0]);
      const diast = parseInt(partes[1]);
      if (sist >= 140 || diast >= 90)
        alertas.push({
          tipo: "URGENTE",
          campo: "Presion_Arterial",
          mensaje: `🔴 Enfermería registró TA elevada: ${enfermeria.presion_arterial} mmHg`,
        });
    }
  }

  if (ultimoDP?.cancer_cervico_hpv === "Patologico")
    alertas.push({
      tipo: "URGENTE",
      campo: "Control_odontologico",
      mensaje: "🔴 HPV Patológico en DP anterior",
    });

  res.json({ success: true, afiliado, alertas });
});

app.listen(PORT, () =>
  console.log(`Odontología corriendo en http://localhost:${PORT}`),
);
