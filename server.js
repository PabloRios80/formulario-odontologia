require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const multer = require('multer');
const upload = multer();

const app = express();
const PORT = process.env.PORT || 3004;

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Ruta para guardar formulario odontología
app.post('/guardar-odontologia', upload.none(), async (req, res) => {
    const data = req.body;
    console.log('Datos recibidos:', data);

    try {
        // 1. Guardar en Supabase
        const { error } = await supabase
            .from('odontologia_consultas')
            .insert({
                odontologo: data.Odontologo,
                fecha: data.Fecha,
                dni: data.DNI,
                apellido: data.Apellido,
                nombre: data.Nombre,
                edad: data.Edad,
                sexo: data.Sexo,
                fuma: data.Fuma,
                patologias: data.Patologias,
                medicacion: data.Medicacion,
                alergias: data.Alergias,
                examen_extraoral: data['Examen extraoral'],
                examen_intraoral: data['Examen intraoral'],
                protesis_removibles: data['Utiliza prótesis removibles'] || data['Utiliza prÃ³tesis removibles'],
                piezas_cariadas: data['Piezas cariada'],
                piezas_perdidas: data['Piezas perdidas'],
                piezas_obturadas: data['Piezas obturadas'],
                dieta_azucar: data['Dieta, momentos de azúcar'] || data['Dieta, momentos de azÃºcar'],
                higiene_bucal: data['Higiene Bucal placa a simple vista'],
                antecedentes_cancer_oral: data['Antecedentes de cáncer oral'] || data['Antecedentes de cÃ¡ncer oral'],
                necesidad_implantes: data['Necesidad de implantes o prótesis'] || data['Necesidad de implantes o prÃ³tesis'],
                ortodoncia: data.Ortodoncia,
                controles_odontologicos: data['Controles odontológicos'] || data['Controles odontolÃ³gicos'],
                riesgo_evaluacion: data['RIESGO - Evaluación General'] || data['RIESGO - EvaluaciÃ³n General'],
                conformidad_cobertura: data['Conformidad con cobertura de su Obra Social'],
                observaciones: data.Observaciones
            });

        if (error) console.error('Error Supabase:', error);
        else console.log('✅ Odontología guardada en Supabase para DNI:', data.dni);

        // 2. Reenviar a Apps Script para mantener el PDF
        try {
            const formData = new URLSearchParams(data).toString();
            await axios.post(process.env.APPS_SCRIPT_URL, formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
        } catch (e) {
            console.error('Error Apps Script:', e.message);
        }

        res.json({ result: 'success' });

    } catch (e) {
        console.error('Error:', e.message);
        res.status(500).json({ result: 'error', message: e.message });
    }
});

app.use((req, res, next) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    next();
});

app.post('/guardar-odontologia', upload.none(), async (req, res) => {
    const data = req.body;
    console.log('Datos recibidos:', JSON.stringify(data, null, 2));
    res.json({ result: 'success' });
});

app.listen(PORT, () => console.log(`Odontología corriendo en http://localhost:${PORT}`));
