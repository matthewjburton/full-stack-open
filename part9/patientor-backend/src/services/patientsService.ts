import patients from '../../data/patients';

import { NewPatient, NonSensitivePatient, Patient } from '../types';
import { v1 as uuid } from 'uuid';

const getPatients = (): Patient[] => {
  return patients;
};

const getNonSensitivePatients = (): NonSensitivePatient[] => {
  return patients.map(({ id, name, dateOfBirth, gender, occupation }) => ({
    id,
    name,
    dateOfBirth,
    gender,
    occupation,
  }));
};

const getNonSensitivePatientById = (
  id: string
): NonSensitivePatient | undefined => {
  return patients.find((patient: NonSensitivePatient) => patient.id === id);
};

const addPatient = (patient: NewPatient): Patient => {
  const newPatient: Patient = {
    id: uuid(),
    ...patient,
  };

  patients.push(newPatient);
  return newPatient;
};

export default {
  getPatients,
  getNonSensitivePatients,
  getNonSensitivePatientById,
  addPatient,
};
