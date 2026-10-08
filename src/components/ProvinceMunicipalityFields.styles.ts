import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  group: { marginBottom: 14 },
  label: { color: '#9a7a67', fontSize: 11, fontWeight: '700', marginBottom: 6, marginTop: 5 },
  select: { minHeight: 46, borderWidth: 1, borderColor: '#d8c5ba', borderRadius: 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectInvalid: { borderColor: '#c4473a' },
  selectValid: { borderColor: '#3b9b69' },
  selectDisabled: { backgroundColor: '#f7f3f0', opacity: 0.7 },
  value: { flex: 1, color: '#3f352f', fontSize: 15 },
  placeholder: { color: '#8b817b' },
  chevron: { color: '#795948', fontSize: 20, marginLeft: 12 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(38, 28, 23, 0.42)' },
  scrim: { ...StyleSheet.absoluteFill },
  sheet: { maxHeight: '82%', minHeight: '55%', backgroundColor: '#fffaf7', borderTopLeftRadius: 14, borderTopRightRadius: 14, paddingTop: 18, paddingHorizontal: 20, paddingBottom: 20 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { color: '#45352e', fontSize: 18, fontWeight: '700' },
  close: { color: '#795948', fontSize: 30, lineHeight: 32, paddingHorizontal: 4 },
  search: { minHeight: 44, borderWidth: 1, borderColor: '#d8c5ba', borderRadius: 6, paddingHorizontal: 12, color: '#3f352f', marginBottom: 10 },
  option: { minHeight: 46, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e7dbd3' },
  optionText: { color: '#3f352f', fontSize: 15 },
  empty: { color: '#776a63', paddingVertical: 18, textAlign: 'center' },
});