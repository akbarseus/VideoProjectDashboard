import { Component } from "react";

/**
 * Kalau ada error render di manapun (data korup, field tak terduga, dll),
 * tanpa ini seluruh app jadi blank putih tanpa penjelasan. Dengan ini,
 * error ditangkap per-halaman dan user masih bisa reload/lanjut kerja
 * tanpa harus refresh manual atau bingung layar putih.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Dashboard render error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight:"60vh", display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center", gap:12, padding:32, textAlign:"center",
        }}>
          <div style={{ fontSize:16, fontWeight:700, color:"#0F172A" }}>
            Terjadi kesalahan saat menampilkan halaman ini
          </div>
          <div style={{ fontSize:13, color:"#64748B", maxWidth:420 }}>
            Data mungkin sedang tidak lengkap atau ada format yang tidak terduga. Coba muat ulang halaman.
          </div>
          <button onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{
              padding:"8px 16px", borderRadius:8, border:"none", cursor:"pointer",
              background:"linear-gradient(135deg, #3EBDAC, #2AA897)", color:"#fff",
              fontSize:13, fontWeight:600,
            }}>
            Muat ulang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
