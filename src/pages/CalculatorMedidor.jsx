import { useEffect, useRef, useState } from 'react';
import Modal from '../components/Modal';
import PublicHeader from '../components/PublicHeader';
import { validateMeterPhoto } from '../lib/files';
import {
  DNI_ERROR,
  MEASUREMENT_FORMAT_ERROR,
  buildMeterCalculation,
  getConsumptionPreview,
  loadSavedPersonalData,
  saveCalculationHistory,
  submitMeterCalculation,
  validateMeterForm,
} from '../lib/meterCalculations';
import {
  formatKwh,
  isValidDni,
  isValidMeasurementFormat,
  normalizeMeasurement,
  sanitizeMeasurementInput,
} from '../lib/measurement';

const EMPTY_VALUES = {
  nombre: '',
  apellido: '',
  dni: '',
  habitacion: '',
  medicionAnterior: '',
  medicionActual: '',
};

const PHOTO_ERROR_STYLE = { display: 'block', color: '#e74c3c', fontSize: '0.9rem', marginTop: '0.5rem' };

function FieldError({ message }) {
  return message ? <div className="error-message">{message}</div> : null;
}

function withoutKey(object, key) {
  const { [key]: removed, ...rest } = object;
  return rest;
}

/**
 * One meter photo: camera/gallery buttons, a hidden file input and a preview.
 * The camera button turns on `capture="environment"` (rear camera); the gallery
 * button removes it.
 */
function PhotoUpload({ id, title, description, photo, error, onSelect }) {
  const inputRef = useRef(null);

  // The file input is uncontrolled: empty it when the photo is cleared (form reset).
  useEffect(() => {
    if (!photo && inputRef.current) inputRef.current.value = '';
  }, [photo]);

  const openPicker = (useCamera) => {
    const input = inputRef.current;
    if (useCamera) input.setAttribute('capture', 'environment');
    else input.removeAttribute('capture');
    input.click();
  };

  const classes = ['photo-upload-group'];
  if (photo?.preview) classes.push('has-photo');
  if (error) classes.push('error');

  return (
    <div className={classes.join(' ')} id={`${id}Group`}>
      <h4>{title}</h4>
      <p>{description}</p>
      <div className="upload-buttons">
        <button type="button" className="upload-btn" onClick={() => openPicker(true)}>
          Tomar foto
        </button>
        <button type="button" className="upload-btn" onClick={() => openPicker(false)}>
          Galería
        </button>
      </div>
      <input
        type="file"
        id={id}
        name={id}
        accept="image/*"
        style={{ display: 'none' }}
        ref={inputRef}
        onChange={(event) => onSelect(event.target)}
      />
      <img
        id={`${id}Preview`}
        className="photo-preview"
        src={photo?.preview || undefined}
        alt=""
        style={{ display: photo?.preview ? 'block' : 'none' }}
      />
      {error && (
        <div className="error-message" style={PHOTO_ERROR_STYLE}>
          {error}
        </div>
      )}
    </div>
  );
}

export default function CalculatorMedidor() {
  const [values, setValues] = useState(() => ({ ...EMPTY_VALUES, ...loadSavedPersonalData() }));
  const [errors, setErrors] = useState({});
  // { fotoAnterior: { file, preview }, fotoActual: { file, preview } }
  const [photos, setPhotos] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [resultKwh, setResultKwh] = useState(null);

  const consumption = getConsumptionPreview(values.medicionAnterior, values.medicionActual);
  const modalOpen = resultKwh !== null;

  // Block page scroll while the result dialog is open.
  useEffect(() => {
    if (!modalOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [modalOpen]);

  const setError = (field, message) => setErrors((current) => ({ ...current, [field]: message }));
  const clearError = (field) => setErrors((current) => withoutKey(current, field));

  const handleTextChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  };

  const handleDniChange = (event) => {
    const { value } = event.target;
    setValues((current) => ({ ...current, dni: value }));
    if (value && !isValidDni(value)) setError('dni', DNI_ERROR);
    else clearError('dni');
  };

  const handleMeasurementChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: sanitizeMeasurementInput(value) }));
  };

  const handleMeasurementBlur = (event) => {
    const { name, value } = event.target;
    if (!value) {
      clearError(name);
    } else if (!isValidMeasurementFormat(value)) {
      setError(name, MEASUREMENT_FORMAT_ERROR);
    } else {
      setValues((current) => ({ ...current, [name]: normalizeMeasurement(value) }));
      clearError(name);
    }
  };

  const handlePhotoSelect = (field) => (input) => {
    const file = input.files[0];
    if (!file) return;

    const problem = validateMeterPhoto(file);
    if (problem) {
      window.alert(problem);
      input.value = '';
      return;
    }

    // Keep the previous preview visible until the new one is loaded.
    setPhotos((current) => ({ ...current, [field]: { file, preview: current[field]?.preview ?? null } }));
    const reader = new FileReader();
    reader.onload = () => {
      setPhotos((current) =>
        current[field]?.file === file ? { ...current, [field]: { file, preview: reader.result } } : current,
      );
      clearError(field);
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setValues(EMPTY_VALUES);
    setErrors({});
    setPhotos({});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationErrors = validateMeterForm(values, {
      hasAnterior: Boolean(photos.fotoAnterior),
      hasActual: Boolean(photos.fotoActual),
    });
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    const calculation = buildMeterCalculation(values, {
      fotoAnterior: photos.fotoAnterior.file,
      fotoActual: photos.fotoActual.file,
    });

    try {
      await submitMeterCalculation(calculation);
      saveCalculationHistory(calculation);
      setResultKwh(calculation.consumoCalculado);
      resetForm();
    } catch (serverError) {
      console.error('Error al comunicarse con el servidor:', serverError);
      window.alert(
        'No se pudo enviar la medición al servidor.\n\n' +
          'La lectura NO fue registrada. Podés intentar nuevamente cuando tengas conexión; ' +
          'los datos del formulario se conservaron.\n\n' +
          `Detalle: ${serverError.message || 'Error de conexión'}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const groupClass = (field) => (errors[field] ? 'form-group error' : 'form-group');
  const measurementClass = (field) =>
    errors[field] ? 'form-group measurement-input error' : 'form-group measurement-input';

  return (
    <div className="page-top-offset">
      <PublicHeader logoOnly />

      <main className="calculator-section">
        <div className="container">
          <div className="calculator-container">
            <h1 className="section-title">Calculadora de Medidor</h1>
            <p className="section-subtitle">Calcula tu consumo de electricidad mensual</p>

            <form id="calculatorForm" className="calculator-form" onSubmit={handleSubmit}>
              <div className={groupClass('nombre')}>
                <label htmlFor="nombre">Nombre *</label>
                <input type="text" id="nombre" name="nombre" value={values.nombre} onChange={handleTextChange} />
                <FieldError message={errors.nombre} />
              </div>

              <div className={groupClass('apellido')}>
                <label htmlFor="apellido">Apellido *</label>
                <input
                  type="text"
                  id="apellido"
                  name="apellido"
                  value={values.apellido}
                  onChange={handleTextChange}
                />
                <FieldError message={errors.apellido} />
              </div>

              <div className={groupClass('dni')}>
                <label htmlFor="dni">DNI *</label>
                <input
                  type="number"
                  id="dni"
                  name="dni"
                  min="1000000"
                  max="99999999"
                  value={values.dni}
                  onChange={handleDniChange}
                />
                <FieldError message={errors.dni} />
              </div>

              <div className={groupClass('habitacion')}>
                <label htmlFor="habitacion">Nro de Habitación/Apartamento - Direccion Nro Puerta*</label>
                <input
                  type="text"
                  id="habitacion"
                  name="habitacion"
                  placeholder="Ej: Apto 1, Hab 5 / Humberto Primo 3070 - 3068"
                  value={values.habitacion}
                  onChange={handleTextChange}
                />
                <FieldError message={errors.habitacion} />
              </div>

              <div className={measurementClass('medicionAnterior')}>
                <label htmlFor="medicionAnterior">Medición del mes anterior *</label>
                <input
                  type="text"
                  id="medicionAnterior"
                  name="medicionAnterior"
                  inputMode="decimal"
                  placeholder="Ej: 003565.3 o 003565,3"
                  value={values.medicionAnterior}
                  onChange={handleMeasurementChange}
                  onBlur={handleMeasurementBlur}
                />
                <span className="measurement-unit">kWh</span>
                <FieldError message={errors.medicionAnterior} />
              </div>

              <div className={measurementClass('medicionActual')}>
                <label htmlFor="medicionActual">Medición del mes actual *</label>
                <input
                  type="text"
                  id="medicionActual"
                  name="medicionActual"
                  inputMode="decimal"
                  placeholder="Ej: 003625.2 o 003625,2"
                  value={values.medicionActual}
                  onChange={handleMeasurementChange}
                  onBlur={handleMeasurementBlur}
                />
                <span className="measurement-unit">kWh</span>
                <FieldError message={errors.medicionActual} />
              </div>

              <div id="calculationPreview" className={consumption === null ? 'calculation-result' : 'calculation-result show'}>
                <h3>Consumo calculado:</h3>
                <div className="result-amount" id="consumoCalculado">
                  {formatKwh(consumption ?? 0)}
                </div>
              </div>

              <div className="photo-upload-container">
                <PhotoUpload
                  id="fotoAnterior"
                  title="Foto del medidor - Mes anterior *"
                  description="Sube la foto de la medición anterior"
                  photo={photos.fotoAnterior}
                  error={errors.fotoAnterior}
                  onSelect={handlePhotoSelect('fotoAnterior')}
                />
                <PhotoUpload
                  id="fotoActual"
                  title="Foto del medidor - Mes actual *"
                  description="Sube la foto de la medición actual"
                  photo={photos.fotoActual}
                  error={errors.fotoActual}
                  onSelect={handlePhotoSelect('fotoActual')}
                />
              </div>

              <button
                type="submit"
                className={submitting ? 'cta-button processing' : 'cta-button'}
                id="submitBtn"
                disabled={submitting}
              >
                {submitting ? 'Procesando...' : 'Enviar'}
              </button>
            </form>
          </div>
        </div>
      </main>

      <Modal id="resultModal" open={modalOpen}>
        <div className="modal-title">✅ Datos enviados correctamente</div>
        <p>Consumo calculado:</p>
        <div className="modal-amount" id="modalAmount">
          {formatKwh(resultKwh ?? 0)}
        </div>
        <p>
          <strong>Fecha tope de pago 05 de cada mes</strong>
        </p>
        <button type="button" className="cta-button close-modal" onClick={() => setResultKwh(null)}>
          Cerrar
        </button>
      </Modal>
    </div>
  );
}
