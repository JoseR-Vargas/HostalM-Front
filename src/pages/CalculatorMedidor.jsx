import { useEffect, useRef, useState } from 'react';
import Modal, { ModalTitle } from '../components/Modal';
import PublicHeader from '../components/PublicHeader';
import { Banner, Button, Field, SectionSubtitle, SectionTitle, cls } from '../components/ui';
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

  return (
    <div
      id={`${id}Group`}
      className={cls(
        'photo-upload-group rounded-xl border-2 bg-soft p-6 text-center transition-all duration-300 hover:bg-card',
        photo?.preview ? 'has-photo border-solid border-accent' : 'border-dashed border-border hover:border-primary',
        error && 'error',
      )}
    >
      <h4>{title}</h4>
      <p>{description}</p>
      <div className="mt-4 grid grid-cols-[1fr_1fr] gap-4 tablet:grid-cols-[1fr]">
        {[
          ['Tomar foto', true],
          ['Galería', false],
        ].map(([label, useCamera]) => (
          <Button
            key={label}
            variant="secondary"
            type="button"
            className="upload-btn"
            onClick={() => openPicker(useCamera)}
          >
            {label}
          </Button>
        ))}
      </div>
      <input
        type="file"
        id={id}
        name={id}
        accept="image/*"
        className="hidden"
        ref={inputRef}
        onChange={(event) => onSelect(event.target)}
      />
      <img
        id={`${id}Preview`}
        className="mt-4 max-h-[200px] max-w-full rounded-lg object-cover shadow-card"
        src={photo?.preview || undefined}
        alt=""
        style={{ display: photo?.preview ? 'block' : 'none' }}
      />
      {error && (
        <Banner tone="error" className="error-message p-3 leading-[1.3]" style={PHOTO_ERROR_STYLE}>
          {error}
        </Banner>
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
  const closeResult = () => setResultKwh(null);

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

  const field = (id, label, props) => (
    <Field
      id={id}
      label={label}
      type="text"
      value={values[id]}
      error={Boolean(errors[id])}
      errorMessage={errors[id]}
      onChange={handleTextChange}
      {...props}
    />
  );
  const measurement = (id, label, placeholder) =>
    field(id, label, {
      inputMode: 'decimal',
      placeholder,
      unit: 'kWh',
      onChange: handleMeasurementChange,
      onBlur: handleMeasurementBlur,
    });

  return (
    <div className="pt-[120px] tablet:pt-[140px] phone:pt-[170px]">
      <PublicHeader logoOnly />

      <main>
        <div className="container">
          <div className="mx-auto max-w-[600px] rounded-xl border border-border bg-card px-4 py-8 shadow-card tablet:m-4 tablet:py-6">
            <SectionTitle as="h1" className="mb-8 phone:mb-6">
              Calculadora de Medidor
            </SectionTitle>
            <SectionSubtitle as="p">Calcula tu consumo de electricidad mensual</SectionSubtitle>

            <form id="calculatorForm" onSubmit={handleSubmit}>
              {field('nombre', 'Nombre *')}
              {field('apellido', 'Apellido *')}
              {field('dni', 'DNI *', { type: 'number', min: '1000000', max: '99999999', onChange: handleDniChange })}
              {field('habitacion', 'Nro de Habitación/Apartamento - Direccion Nro Puerta*', {
                placeholder: 'Ej: Apto 1, Hab 5 / Humberto Primo 3070 - 3068',
              })}
              {measurement('medicionAnterior', 'Medición del mes anterior *', 'Ej: 003565.3 o 003565,3')}
              {measurement('medicionActual', 'Medición del mes actual *', 'Ej: 003625.2 o 003625,2')}

              <div
                id="calculationPreview"
                className={cls(
                  'my-6 rounded-xl border-2 border-accent bg-card p-6 text-center',
                  consumption === null ? 'hidden' : 'show animate-slide-in',
                )}
              >
                <h3>Consumo calculado:</h3>
                <div className="my-2 text-[2rem] font-bold text-primary" id="consumoCalculado">
                  {formatKwh(consumption ?? 0)}
                </div>
              </div>

              <div className="my-6 grid gap-6">
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

              <Button type="submit" id="submitBtn" disabled={submitting} processing={submitting}>
                {submitting ? 'Procesando...' : 'Enviar'}
              </Button>
            </form>
          </div>
        </div>
      </main>

      <Modal
        id="resultModal"
        open={modalOpen}
        titleId="resultModalTitle"
        title={<ModalTitle id="resultModalTitle">✅ Datos enviados correctamente</ModalTitle>}
        onClose={closeResult}
        bodyClassName="text-center"
        footer={
          <Button variant="primary" size="sm" className="close-modal" onClick={closeResult}>
            Cerrar
          </Button>
        }
      >
        <p>Consumo calculado:</p>
        <div className="my-4 text-[2.5rem] font-extrabold text-primary" id="modalAmount">
          {formatKwh(resultKwh ?? 0)}
        </div>
        <p>
          <strong>Fecha tope de pago 05 de cada mes</strong>
        </p>
      </Modal>
    </div>
  );
}
