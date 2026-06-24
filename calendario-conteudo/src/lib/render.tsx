import "server-only";
import { ImageResponse } from "next/og";

// Renderiza a arte de um post como PNG, na própria plataforma, usando o brand
// guide do cliente. Sem serviços externos: roda no servidor (inclusive no robô
// diário) com a tecnologia @vercel/og (Satori + resvg).

const SIZE = 1080;

export type Brand = {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  fontFamily: string;
  logoUrl?: string | null;
  tagline?: string | null;
};

export type PostArt = {
  title?: string | null;
  copy: string;
  photoUrl?: string | null;
};

function Layout({ brand, post }: { brand: Brand; post: PostArt }) {
  const hasPhoto = Boolean(post.photoUrl);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: SIZE,
        height: SIZE,
        position: "relative",
        fontFamily: brand.fontFamily,
        backgroundColor: brand.secondaryColor,
        color: brand.textColor,
      }}
    >
      {/* Fundo: foto (se houver) ou gradiente da marca */}
      {hasPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.photoUrl as string}
          alt=""
          width={SIZE}
          height={SIZE}
          style={{ position: "absolute", top: 0, left: 0, width: SIZE, height: SIZE, objectFit: "cover" }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: SIZE,
            height: SIZE,
            display: "flex",
            backgroundImage: `linear-gradient(135deg, ${brand.secondaryColor} 0%, ${brand.primaryColor} 100%)`,
          }}
        />
      )}

      {/* Véu escuro para dar contraste ao texto */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: SIZE,
          height: SIZE,
          display: "flex",
          backgroundImage:
            "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.0) 35%, rgba(0,0,0,0.65) 100%)",
        }}
      />

      {/* Topo: logo */}
      <div style={{ display: "flex", alignItems: "center", padding: 64, zIndex: 10 }}>
        {brand.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.logoUrl}
            alt=""
            height={84}
            style={{ height: 84, objectFit: "contain" }}
          />
        ) : (
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>
            {brand.name}
          </div>
        )}
      </div>

      {/* Rodapé: barra de destaque + título + copy + tagline */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: "auto",
          padding: 64,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", width: 110, height: 10, backgroundColor: brand.accentColor, marginBottom: 28 }} />
        {post.title ? (
          <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.05, marginBottom: 20 }}>
            {post.title}
          </div>
        ) : null}
        {post.copy ? (
          <div style={{ display: "flex", fontSize: 38, lineHeight: 1.25, opacity: 0.95 }}>
            {post.copy.length > 180 ? `${post.copy.slice(0, 177)}...` : post.copy}
          </div>
        ) : null}
        {brand.tagline ? (
          <div style={{ display: "flex", fontSize: 28, marginTop: 32, color: brand.accentColor, fontWeight: 600 }}>
            {brand.tagline}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export async function renderPostArt(brand: Brand, post: PostArt): Promise<Buffer> {
  const response = new ImageResponse(<Layout brand={brand} post={post} />, {
    width: SIZE,
    height: SIZE,
  });
  return Buffer.from(await response.arrayBuffer());
}
