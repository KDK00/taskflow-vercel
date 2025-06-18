export function FloatingShapes() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <div 
        className="floating-shape"
        style={{
          width: "60px",
          height: "60px",
          left: "10%",
          animationDelay: "0s",
        }}
      />
      <div 
        className="floating-shape"
        style={{
          width: "80px",
          height: "80px",
          left: "70%",
          animationDelay: "5s",
        }}
      />
      <div 
        className="floating-shape"
        style={{
          width: "40px",
          height: "40px",
          left: "85%",
          animationDelay: "10s",
        }}
      />
      <div 
        className="floating-shape"
        style={{
          width: "100px",
          height: "100px",
          left: "20%",
          animationDelay: "15s",
        }}
      />
    </div>
  );
}
