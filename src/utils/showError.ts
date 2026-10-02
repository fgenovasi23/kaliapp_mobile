import { Alert } from 'react-native';
import { ApiError } from '../api';

export default function showError(error: unknown) {
  Alert.alert('Operazione non riuscita', error instanceof ApiError || error instanceof Error ? error.message : 'Riprova tra poco.');
}