import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fffaf7' },
  grow: { flex: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fffaf7' },
  appHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8, backgroundColor: '#fffaf7' },
  headerTitleWrap: { flex: 1 },
  headerLogo: { fontFamily: 'serif', color: '#6c4a3d', fontSize: 30, letterSpacing: 0.8 },
  headerSubtitle: { color: '#8f7367', fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 2 },
  headerLogoutButton: { borderWidth: 1, borderColor: '#d7b9a7', backgroundColor: '#f8efe8', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  headerLogoutText: { color: '#815841', fontWeight: '700', fontSize: 12 },
  tabBar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#eadacb', backgroundColor: '#fffaf7', paddingVertical: 10, paddingHorizontal: 12 },
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  tabDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#d7c0b0', marginBottom: 4 },
  tabDotActive: { backgroundColor: '#785647' },
  tabText: { color: '#8c7a70', fontSize: 12 },
  tabTextActive: { color: '#654938', fontWeight: '700' },
});