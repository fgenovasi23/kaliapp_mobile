import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import locationData from '../data/italian-municipalities.json';
import styles from './ProvinceMunicipalityFields.styles';

type Municipality = { name: string; province: string; province_code: string };
type PickerMode = 'province' | 'municipality';

const municipalities = locationData.municipalities as Municipality[];
const provinces = [...new Set(municipalities.map((item) => item.province))]
  .sort((left, right) => left.localeCompare(right, 'it'));

export default function ProvinceMunicipalityFields({
  province,
  municipality,
  onChange,
  disabled = false,
  required = true,
}: {
  province: string;
  municipality: string;
  onChange: (province: string, municipality: string) => void;
  disabled?: boolean;
  required?: boolean;
}) {
  const [pickerMode, setPickerMode] = useState<PickerMode | null>(null);
  const [query, setQuery] = useState('');
  const options = (pickerMode === 'province'
    ? provinces
    : municipalities.filter((item) => item.province === province).map((item) => item.name))
    .filter((name) => name.toLocaleLowerCase('it').includes(query.trim().toLocaleLowerCase('it')));

  const openPicker = (mode: PickerMode) => {
    setQuery('');
    setPickerMode(mode);
  };

  const choose = (value: string) => {
    if (pickerMode === 'province') onChange(value, '');
    else onChange(province, value);
    setPickerMode(null);
  };

  return <>
    <View style={styles.group}>
      <Text style={styles.label}>Provincia{required ? ' *' : ''}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Seleziona provincia"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => openPicker('province')}
        style={[styles.select, province ? styles.selectValid : styles.selectInvalid, disabled && styles.selectDisabled]}
      >
        <Text style={[styles.value, !province && styles.placeholder]}>{province || 'Seleziona provincia'}</Text>
        <Text style={styles.chevron}>⌄</Text>
      </Pressable>
      <Text style={styles.label}>Comune{required ? ' *' : ''}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Seleziona comune"
        accessibilityState={{ disabled: disabled || !province }}
        disabled={disabled || !province}
        onPress={() => openPicker('municipality')}
        style={[styles.select, municipality ? styles.selectValid : styles.selectInvalid, (disabled || !province) && styles.selectDisabled]}
      >
        <Text style={[styles.value, !municipality && styles.placeholder]}>{municipality || (province ? 'Seleziona comune' : 'Seleziona prima la provincia')}</Text>
        <Text style={styles.chevron}>⌄</Text>
      </Pressable>
    </View>
    <Modal transparent visible={pickerMode !== null} animationType="slide" onRequestClose={() => setPickerMode(null)}>
      <View style={styles.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Chiudi selezione" style={styles.scrim} onPress={() => setPickerMode(null)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{pickerMode === 'province' ? 'Seleziona provincia' : 'Seleziona comune'}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Chiudi" hitSlop={10} onPress={() => setPickerMode(null)}>
              <Text style={styles.close}>×</Text>
            </Pressable>
          </View>
          <TextInput
            accessibilityLabel={pickerMode === 'province' ? 'Cerca provincia' : 'Cerca comune'}
            autoCapitalize="words"
            onChangeText={setQuery}
            placeholder={pickerMode === 'province' ? 'Cerca provincia' : 'Cerca comune'}
            placeholderTextColor="#8b817b"
            style={styles.search}
            value={query}
          />
          <ScrollView keyboardShouldPersistTaps="handled">
            {options.map((option) => (
              <Pressable
                accessibilityRole="button"
                key={option}
                onPress={() => choose(option)}
                style={styles.option}
              >
                <Text style={styles.optionText}>{option}</Text>
              </Pressable>
            ))}
            {options.length === 0 && <Text style={styles.empty}>Nessun risultato</Text>}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}