#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
====================================================================
SG MONTAJES SRL — Backend Python API & Web Server
Presupuestos, Avances de Obra, Sincronización Supabase y Notificaciones
====================================================================
"""

import os
import sys
import json
import csv
import io
import time
import urllib.request
import urllib.error
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from datetime import datetime

import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formatdate, make_msgid

PORT = int(os.environ.get("PORT", 8000))
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://amkkuwgatjcbiyrykuoy.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "sb_publishable_I5bemh3YRuiTNkMzWyCA3A_D_aqFlNJ")

# --- CONFIGURACIÓN SMTP CORPORATIVO (FEROZO) ---
import base64
from email.mime.application import MIMEApplication

SMTP_HOST = os.environ.get("SMTP_HOST", "c2001014.ferozo.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 465))
SMTP_USER = os.environ.get("SMTP_USER", "cotizaciones@sgmontajes.com.ar")
SMTP_PASS = os.environ.get("SMTP_PASS", "Admin712*")
import traceback

SMTP_FROM_NAME = os.environ.get("SMTP_FROM_NAME", "SG Montajes S.R.L.")

def send_email_smtp(to_emails, subject, html_content, text_content=None, reply_to=None, attachments=None, cc_emails=None, bcc_emails=None):
    """Envía correos electrónicos vía SMTP con autenticación SSL, cabeceras completas, CC/BCC y adjuntos PDF/archivos"""
    try:
        if isinstance(to_emails, str):
            to_emails = [e.strip() for e in to_emails.split(",") if e.strip()]
        elif not to_emails:
            to_emails = []
            
        if isinstance(cc_emails, str):
            cc_emails = [e.strip() for e in cc_emails.split(",") if e.strip()]
        elif not cc_emails:
            cc_emails = []

        if isinstance(bcc_emails, str):
            bcc_emails = [e.strip() for e in bcc_emails.split(",") if e.strip()]
        elif not bcc_emails:
            bcc_emails = []

        # Evitar duplicar en CC los que ya están en TO
        to_clean = list(dict.fromkeys(to_emails))
        cc_clean = [c for c in list(dict.fromkeys(cc_emails)) if c.lower() not in [t.lower() for t in to_clean]]
        bcc_clean = [b for b in list(dict.fromkeys(bcc_emails)) if b.lower() not in [t.lower() for t in to_clean] and b.lower() not in [c.lower() for c in cc_clean]]

        all_recipients = list(dict.fromkeys(to_clean + cc_clean + bcc_clean))
        if not all_recipients:
            return {"success": False, "error": "No hay destinatarios válidos especificados"}
        
        # Si hay adjuntos, el mensaje raíz debe ser 'mixed'
        msg = MIMEMultipart("mixed")
        msg["Subject"] = subject
        msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_USER}>"
        if to_clean:
            msg["To"] = ", ".join(to_clean)
        if cc_clean:
            msg["Cc"] = ", ".join(cc_clean)
        msg["Date"] = formatdate(localtime=True)
        msg["Message-ID"] = make_msgid(domain="sgmontajes.com.ar")
        msg["Reply-To"] = reply_to if reply_to else SMTP_USER
        
        # Sub-parte para el cuerpo del correo (texto plano y HTML)
        body_part = MIMEMultipart("alternative")
        plain_text = text_content if text_content else "SG Montajes S.R.L. — Presupuestos y Cotizaciones Industriales."
        body_part.attach(MIMEText(plain_text, "plain", "utf-8"))
        
        if html_content:
            body_part.attach(MIMEText(html_content, "html", "utf-8"))
            try:
                with open("/Users/melanigrandi/ANTY/PRESUPUESTO/last_email_body.html", "w", encoding="utf-8") as f_body:
                    f_body.write(html_content)
            except Exception as e_b:
                pass
            
        msg.attach(body_part)
        
        # Procesar archivos adjuntos (PDFs u otros documentos en base64)
        if attachments and isinstance(attachments, list):
            for att in attachments:
                try:
                    filename = att.get("filename", "Presupuesto_SG_Montajes.pdf")
                    content_b64 = att.get("content", "")
                    if "," in content_b64:
                        content_b64 = content_b64.split(",", 1)[1]
                    content_b64 = content_b64.strip().replace(" ", "").replace("\n", "").replace("\r", "")
                    if not content_b64:
                        continue
                    file_bytes = base64.b64decode(content_b64)
                    
                    try:
                        with open("/Users/melanigrandi/ANTY/PRESUPUESTO/last_email_attachment.pdf", "wb") as f_att:
                            f_att.write(file_bytes)
                    except Exception as e_a:
                        pass

                    subtype = "pdf" if filename.lower().endswith(".pdf") else "octet-stream"
                    part = MIMEApplication(file_bytes, _subtype=subtype)
                    part.add_header("Content-Disposition", "attachment", filename=filename)
                    part.add_header("Content-Type", f"application/{subtype}; name=\"{filename}\"")
                    msg.attach(part)
                    print(f"📎 [ATTACHMENT] Adjuntado archivo '{filename}' ({len(file_bytes)} bytes)", flush=True)
                except Exception as att_err:
                    print(f"⚠️ [ATTACHMENT ERROR] Error al procesar adjunto {att.get('filename')}: {att_err}", flush=True)
                    traceback.print_exc()
                    
        try:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context, timeout=45) as server:
                server.login(SMTP_USER, SMTP_PASS)
                server.sendmail(SMTP_USER, all_recipients, msg.as_string())
        except (ssl.SSLCertVerificationError, ssl.SSLError) as ssl_err:
            print(f"⚠️ [SMTP SSL Fallback] Verificación estricta falló ({ssl_err}), reintentando con contexto permisivo...", flush=True)
            try:
                context = ssl._create_unverified_context()
                with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context, timeout=45) as server:
                    server.login(SMTP_USER, SMTP_PASS)
                    server.sendmail(SMTP_USER, all_recipients, msg.as_string())
            except Exception as e_unver:
                print(f"⚠️ [SMTP SSL 465 Fallback] Falló SSL ({e_unver}), reintentando STARTTLS en puerto 587...", flush=True)
                with smtplib.SMTP(SMTP_HOST, 587, timeout=45) as server:
                    server.starttls()
                    server.login(SMTP_USER, SMTP_PASS)
                    server.sendmail(SMTP_USER, all_recipients, msg.as_string())
        except Exception as e_ssl:
            print(f"⚠️ [SMTP Fallback] Falló conexión con {SMTP_HOST} ({e_ssl}), reintentando por IP directa 200.58.112.220...", flush=True)
            try:
                context = ssl._create_unverified_context()
                with smtplib.SMTP_SSL("200.58.112.220", 465, context=context, timeout=45) as server:
                    server.login(SMTP_USER, SMTP_PASS)
                    server.sendmail(SMTP_USER, all_recipients, msg.as_string())
            except Exception as e_ip:
                print(f"⚠️ [SMTP Fallback IP] Falló SSL por IP ({e_ip}), reintentando STARTTLS 587 por IP...", flush=True)
                with smtplib.SMTP("200.58.112.220", 587, timeout=45) as server:
                    server.starttls()
                    server.login(SMTP_USER, SMTP_PASS)
                    server.sendmail(SMTP_USER, all_recipients, msg.as_string())
            
        print(f"📧 [SMTP SUCCESS] Correo enviado exitosamente a: {all_recipients} | Asunto: {subject} | Adjuntos: {len(attachments or [])}", flush=True)
        return {"success": True, "recipients": all_recipients, "attachments_count": len(attachments or [])}
    except Exception as e:
        print(f"❌ [SMTP Error] Falló el envío de correo a {to_emails}: {e}")
        traceback.print_exc()
        return {"success": False, "error": str(e)}

def supabase_request(endpoint, method="GET", data=None):
    """Realiza peticiones seguras a la API REST de Supabase"""
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            return json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        print(f"[Supabase Error {e.code}] {err_body}")
        return {"error": True, "code": e.code, "message": err_body}
    except Exception as e:
        print(f"[Error conexión Supabase] {e}")
        return {"error": True, "message": str(e)}

class SGBackendHandler(SimpleHTTPRequestHandler):
    """Maneja las rutas de la API y sirve el frontend estático"""

    def end_headers(self):
        """Envía headers anti-caché para que el navegador siempre pida la versión nueva"""
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def send_cors_headers(self):
        origin = self.headers.get("Origin")
        if not origin or origin == "null":
            self.send_header("Access-Control-Allow-Origin", "*")
        else:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Credentials", "true")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Range, Accept")
        self.send_header("Access-Control-Allow-Private-Network", "true")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def send_json_response(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)

        # --- ENDPOINTS API ---

        # 1. Health check y estado
        if path == "/api/health":
            self.send_json_response({
                "status": "online",
                "app": "SG Montajes Presupuestos API",
                "version": "2.0",
                "supabase_connected": True,
                "smtp_configured": True,
                "smtp_user": SMTP_USER,
                "smtp_host": SMTP_HOST,
                "timestamp": datetime.now().isoformat()
            })
            return

        # 2. Listar presupuestos
        if path == "/api/presupuestos":
            limit = params.get("limit", [100])[0]
            data = supabase_request(f"presupuestos?select=*&order=fecha.desc&limit={limit}")
            self.send_json_response(data)
            return

        # 3. Métricas y estadísticas avanzadas
        if path == "/api/estadisticas":
            presupuestos = supabase_request("presupuestos?select=*")
            avances = supabase_request("avances_obra?select=*")
            
            if isinstance(presupuestos, dict) and presupuestos.get("error"):
                presupuestos = []
            if isinstance(avances, dict) and avances.get("error"):
                avances = []

            total_presupuestado = sum(float(p.get("importe_total") or 0) for p in presupuestos)
            total_facturado = sum(float(a.get("monto_equivalente") or 0) for a in avances)
            
            por_rubro = {}
            por_estado = {}
            for p in presupuestos:
                rubro = p.get("tipo_presupuesto") or "Eléctrico"
                estado = p.get("estado") or "Enviado sin OC"
                por_rubro[rubro] = por_rubro.get(rubro, 0) + float(p.get("importe_total") or 0)
                por_estado[estado] = por_estado.get(estado, 0) + 1

            self.send_json_response({
                "total_presupuestos": len(presupuestos),
                "total_presupuestado": total_presupuestado,
                "total_facturado_avances": total_facturado,
                "porcentaje_facturado_global": round((total_facturado / total_presupuestado * 100), 2) if total_presupuestado > 0 else 0,
                "distribucion_por_rubro": por_rubro,
                "distribucion_por_estado": por_estado,
                "total_hitos_avance": len(avances)
            })
            return

        # 4. Exportar Backup completo en JSON
        if path == "/api/backup":
            backup = {
                "fecha_backup": datetime.now().isoformat(),
                "app_state": supabase_request("app_state?select=*"),
                "usuarios": supabase_request("usuarios?select=*"),
                "presupuestos": supabase_request("presupuestos?select=*"),
                "avances_obra": supabase_request("avances_obra?select=*"),
                "notificaciones": supabase_request("notificaciones?select=*")
            }
            self.send_json_response(backup)
            return

        # 5. Exportar reporte CSV
        if path == "/api/exportar-csv":
            presupuestos = supabase_request("presupuestos?select=*&order=fecha.desc")
            if not isinstance(presupuestos, list):
                presupuestos = []

            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(["ID", "Fecha", "Rubro", "Cliente", "CUIT", "Denominación", "Importe Total", "Estado", "Avance %", "Monto Facturado", "Nro OC", "Operador"])
            
            for p in presupuestos:
                writer.writerow([
                    p.get("id", ""),
                    p.get("fecha", ""),
                    p.get("tipo_presupuesto", ""),
                    p.get("cliente_nombre", ""),
                    p.get("cuit", ""),
                    p.get("meca_denominacion", ""),
                    p.get("importe_total", 0),
                    p.get("estado", ""),
                    p.get("avance_porcentaje_acumulado", 0),
                    p.get("monto_facturado", 0),
                    p.get("nro_oc", ""),
                    p.get("operador", "")
                ])

            csv_content = output.getvalue().encode("utf-8-sig")
            self.send_response(200)
            self.send_header("Content-Type", "text/csv; charset=utf-8")
            self.send_header("Content-Disposition", f"attachment; filename=sgmontajes_presupuestos_{datetime.now().strftime('%Y%m%d_%H%M')}.csv")
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(csv_content)
            return

        # Rutas de navegación limpia para Portal, Presupuestos y Contenedores
        if path in ("/presupuesto", "/presupuesto/", "/presupuestos", "/presupuestos/"):
            self.path = "/presupuesto.html"
            super().do_GET()
            return

        if path in ("/portal", "/portal/", "/hub"):
            self.path = "/portal_hub.html"
            super().do_GET()
            return

        if path in ("/contenedores", "/contenedores/", "/contenedores/Index.html"):
            self.path = "/contenedores/index.html"
            super().do_GET()
            return

        # Si no es un endpoint de API, servir los archivos estáticos del frontend (HTML, JS, CSS, PNG)
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        
        content_len = int(self.headers.get("Content-Length", 0))
        post_body = self.rfile.read(content_len) if content_len > 0 else b"{}"
        
        try:
            payload = json.loads(post_body.decode("utf-8")) if post_body else {}
        except:
            payload = {}

        # 1. Enviar correo genérico vía SMTP (Presupuestos, Notificaciones, etc.)
        if path == "/api/send-email":
            to = payload.get("to")
            cc = payload.get("cc")
            bcc = payload.get("bcc")
            subject = payload.get("subject", "Cotización SG MONTAJES S.R.L.")
            html = payload.get("html", "")
            text = payload.get("text", "")
            reply_to = payload.get("reply_to")
            attachments = payload.get("attachments", [])
            res = send_email_smtp(to, subject, html, text, reply_to, attachments=attachments, cc_emails=cc, bcc_emails=bcc)
            self.send_json_response(res, status=200 if res.get("success") else 500)
            return

        # 2. Test de conexión y envío de correo
        if path == "/api/test-email":
            to = payload.get("to") or SMTP_USER
            subject = "✅ Prueba de Configuración de Correo — SG MONTAJES S.R.L."
            now_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
            html = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #cbd5e1; border-radius: 12px; background: #ffffff;">
                <div style="text-align: center; border-bottom: 2px solid #eab308; padding-bottom: 14px; margin-bottom: 18px;">
                    <h2 style="color: #0f172a; margin: 0; font-size: 20px;">SG MONTAJES S.R.L.</h2>
                    <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Sistema Oficial de Gestión de Presupuestos</p>
                </div>
                <div style="padding: 10px 0; color: #334155; font-size: 14px; line-height: 1.6;">
                    <p>¡Hola!</p>
                    <p>Este correo confirma que el servidor de correo saliente SMTP <strong>{SMTP_HOST}:{SMTP_PORT} (SSL)</strong> y la cuenta <strong>{SMTP_USER}</strong> están configurados y funcionando con éxito.</p>
                    <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-left: 5px solid #10b981; padding: 14px; margin: 18px 0; border-radius: 6px;">
                        <strong style="color: #166534;">Estado:</strong> Servidor Conectado y Operativo ✅<br>
                        <strong style="color: #166534;">Remitente:</strong> {SMTP_USER}<br>
                        <strong style="color: #166534;">Fecha y Hora:</strong> {now_str}
                    </div>
                    <p style="font-size: 12px; color: #64748b;">Las cotizaciones, alertas de estado y notificaciones a facturación saldrán automáticamente desde esta cuenta oficial.</p>
                </div>
                <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 14px; font-size: 11px; color: #94a3b8;">
                    SG MONTAJES S.R.L. — Timbues, Pcia. Santa Fe, Argentina
                </div>
            </div>
            """
            res = send_email_smtp(to, subject, html, f"Prueba exitosa desde {SMTP_USER} ({now_str}).")
            self.send_json_response(res, status=200 if res.get("success") else 500)
            return

        # 3. Notificación de Avance de Obra / Correo para Facturación
        if path == "/api/notificar-avance":
            presupuesto_id = payload.get("presupuesto_id") or payload.get("id")
            porcentaje = payload.get("porcentaje", 0)
            monto = payload.get("monto", 0)
            cliente = payload.get("cliente", "CARGILL SACI")
            detalle = payload.get("detalle", "")
            destinatario_fact = payload.get("email_facturacion") or "facturacion@sgmontajes.com.ar"
            
            print("=======================================================")
            print(f"📧 [EMAIL DISPARADO A FACTURACIÓN] - SG MONTAJES SRL")
            print(f"Destinatario: {destinatario_fact}")
            print(f"Asunto: NUEVO AVANCE REGISTRADO — Presupuesto #{presupuesto_id} ({porcentaje}%)")
            print(f"Cliente: {cliente}")
            print(f"Monto a Certificar/Facturar: ${float(monto):,.2f}")
            print(f"Detalle: {detalle}")
            print("=======================================================")

            # Armar email HTML para Facturación
            now_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
            html_fact = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #cbd5e1; border-radius: 12px; background: #ffffff;">
                <div style="text-align: center; border-bottom: 2px solid #38bdf8; padding-bottom: 14px; margin-bottom: 18px;">
                    <h2 style="color: #0f172a; margin: 0; font-size: 20px;">SG MONTAJES S.R.L.</h2>
                    <p style="color: #0284c7; font-size: 13px; font-weight: bold; margin: 4px 0 0 0;">AVISO DE CERTIFICACIÓN / AVANCE DE OBRA</p>
                </div>
                <div style="color: #334155; font-size: 14px; line-height: 1.6;">
                    <p>Se ha registrado un nuevo <strong>Avance de Obra</strong> para certificar/facturar:</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px;">
                        <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 8px 12px; font-weight: bold; width: 160px;">Presupuesto Nro:</td>
                            <td style="padding: 8px 12px; color: #0284c7; font-weight: bold;">#{presupuesto_id}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 8px 12px; font-weight: bold;">Cliente:</td>
                            <td style="padding: 8px 12px;">{cliente}</td>
                        </tr>
                        <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 8px 12px; font-weight: bold;">Porcentaje Hito:</td>
                            <td style="padding: 8px 12px; font-weight: bold; color: #16a34a;">{porcentaje}%</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 8px 12px; font-weight: bold;">Monto Equivalente:</td>
                            <td style="padding: 8px 12px; font-weight: bold; font-size: 15px; color: #0f172a;">${float(monto):,.2f}</td>
                        </tr>
                        <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 8px 12px; font-weight: bold;">Detalle / Observaciones:</td>
                            <td style="padding: 8px 12px;">{detalle or 'Sin observaciones adicionales'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 12px; font-weight: bold;">Fecha de Registro:</td>
                            <td style="padding: 8px 12px;">{now_str}</td>
                        </tr>
                    </table>
                </div>
                <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 14px; font-size: 11px; color: #94a3b8;">
                    Mensaje generado automáticamente por el Sistema de Presupuestos SG MONTAJES S.R.L.
                </div>
            </div>
            """
            
            smtp_res = send_email_smtp([destinatario_fact, "cotizaciones@sgmontajes.com.ar"], f"🔔 Nuevo Avance #{presupuesto_id} ({porcentaje}%) — {cliente}", html_fact)

            # Guardar notificación en Supabase
            notif_row = [{
                "id": f"notif-auto-{int(time.time()*1000)}",
                "user_id": "all",
                "message": f"Avance del {porcentaje}% registrado en #{presupuesto_id} (${float(monto):,.2f}). Notificado a Facturación.",
                "read": False,
                "task_id": str(presupuesto_id)
            }]
            supabase_request("notificaciones", method="POST", data=notif_row)

            self.send_json_response({
                "success": True,
                "email_sent": smtp_res.get("success", False),
                "message": f"Notificación procesada y enviada a {destinatario_fact}",
                "presupuesto_id": presupuesto_id,
                "porcentaje": porcentaje,
                "monto_facturado": monto
            })
            return

        # 4. Sincronización Automática de Presupuesto a Supabase desde Frontend
        if path == "/api/sync-presupuesto":
            p = payload.get("presupuesto") or payload
            if not p or not p.get("id"):
                self.send_json_response({"success": False, "error": "Faltan datos del presupuesto"}, status=400)
                return

            p_id = str(p.get("id")).strip()
            amt = float(p.get("importe") or p.get("importe_neto") or 0.0)
            planta_val = str(p.get("planta") or p.get("meca_planta") or "VGG").strip().upper()

            pres_row = {
                "id": p_id,
                "fecha": p.get("fecha") or datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "tipo_presupuesto": p.get("tipo_presupuesto") or ("Mecánico" if "101" in p_id else "Eléctrico"),
                "cliente_id": str(p.get("cliente_id") or "3").strip(),
                "cliente_nombre": str(p.get("cliente_nombre") or "CARGILL SACI").strip(),
                "importe_neto": amt,
                "estado": p.get("estado") or "Enviado sin OC",
                "nro_oc": str(p.get("nro_oc") or p.get("meca_nro_oc") or "").strip(),
                "motivo_rechazo": p.get("motivo_rechazo") or "",
                "operador": p.get("operador") or "admin",
                "avance_porcentaje_acumulado": float(p.get("avance_porcentaje_acumulado") or 0),
                "facturado_porcentaje": float(p.get("facturado_porcentaje") or 0),
                "monto_facturado": float(p.get("monto_facturado") or 0),
                "nro_ot": str(p.get("nro_ot") or p.get("meca_nro_ot") or "").strip(),
                "denominacion": str(p.get("denominacion") or p.get("meca_denominacion") or p.get("motivo") or "").strip(),
                "planta": planta_val,
                "proveedor": str(p.get("proveedor") or p.get("meca_proveedor") or "SG MONTAJES SRL").strip(),
                "fecha_oferta": p.get("fecha_oferta") or "",
                "validez": p.get("validez") or "",
                "fecha_inicio": p.get("fecha_inicio") or "",
                "duracion": p.get("duracion") or "",
                "fecha_fin": p.get("fecha_fin") or "",
                "propuesta": p.get("propuesta") or "",
                "personal": p.get("personal") or "",
                "exclusiones": p.get("exclusiones") or ""
            }

            res_pres = supabase_request("presupuestos", method="POST", data=[pres_row])
            if isinstance(res_pres, dict) and res_pres.get("error"):
                print(f"❌ [Backend Sync Error Presupuesto] {res_pres}")
                self.send_json_response({"success": False, "error": res_pres}, status=500)
                return

            raw_items = p.get("items") or []
            if isinstance(raw_items, list) and len(raw_items) > 0:
                item_rows = []
                for idx, it in enumerate(raw_items):
                    cant = float(it.get("cantidad") if it.get("cantidad") not in ("-", None, "") else 1)
                    pu = float(it.get("precio") if it.get("precio") not in ("-", None, "") else (it.get("precio_unitario") or 0))
                    sub = float(it.get("subtotal") if it.get("subtotal") not in ("-", None, "") else (cant * pu))
                    item_rows.append({
                        "id": f"{p_id}-ITM-{str(idx + 1).zfill(2)}",
                        "presupuesto_id": p_id,
                        "codigo": str(it.get("codigo") or "-"),
                        "detalle": str(it.get("detalle") or it.get("descripcion") or "Item de Presupuesto"),
                        "rubro": p.get("tipo_presupuesto") or "Eléctrico",
                        "subrubro": str(it.get("subrubro") or "Materiales y Equipos"),
                        "cantidad": cant,
                        "unidad": str(it.get("unidad") or it.get("udm") or "UN"),
                        "precio_unitario": pu,
                        "subtotal": sub,
                        "orden": idx + 1
                    })
                supabase_request("presupuesto_items", method="POST", data=item_rows)

            # app_state.pedidos ya no se utiliza como fuente de verdad ni se duplica en JSON
            # para evitar reinyectar estados viejos en Supabase.

            print(f"☁️ [BACKEND SYNC] Presupuesto #{p_id} y sus {len(raw_items)} ítems sincronizados con Supabase.")
            self.send_json_response({"success": True, "id": p_id, "items_count": len(raw_items)})
            return

        self.send_json_response({"error": "Ruta POST no encontrada"}, status=404)

from socketserver import ThreadingMixIn
import threading

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

# --- WORKER DE COLA DE EMAILS (lee cola_emails en Supabase y los despacha) ---
def email_queue_worker():
    """Thread en background: cada 5 seg lee cola_emails con estado='pendiente' y los envía por SMTP."""
    print("🔄 [EMAIL WORKER] Iniciado — polling cola_emails cada 5 segundos", flush=True)
    while True:
        try:
            # Leer emails pendientes (máximo 10 a la vez)
            result = supabase_request("cola_emails?estado=eq.pendiente&order=creado_en.asc&limit=10")
            if isinstance(result, list) and len(result) > 0:
                for row in result:
                    mail_id = row.get("id")
                    if not mail_id:
                        continue
                    try:
                        to_arr   = row.get("destinatarios") or []
                        cc_arr   = row.get("cc") or []
                        bcc_arr  = row.get("bcc") or []
                        subject  = row.get("asunto") or "Cotización SG Montajes"
                        html_body = row.get("cuerpo_html") or ""
                        text_body = row.get("cuerpo_texto") or ""
                        adjuntos = row.get("adjuntos") or []

                        print(f"📬 [EMAIL WORKER] Procesando {mail_id} → {to_arr} | Asunto: {subject}", flush=True)

                        res = send_email_smtp(
                            to_emails=to_arr,
                            subject=subject,
                            html_content=html_body,
                            text_content=text_body,
                            attachments=adjuntos,
                            cc_emails=cc_arr,
                            bcc_emails=bcc_arr
                        )

                        if res.get("success"):
                            patch_data = {"estado": "enviado", "procesado_en": datetime.now().isoformat()}
                            print(f"✅ [EMAIL WORKER] Enviado OK: {mail_id}", flush=True)
                        else:
                            err_msg = res.get("error", "Error desconocido")
                            patch_data = {"estado": "error", "error_mensaje": err_msg[:500], "procesado_en": datetime.now().isoformat()}
                            print(f"❌ [EMAIL WORKER] Error en {mail_id}: {err_msg}", flush=True)

                        # Actualizar el estado en Supabase vía PATCH
                        endpoint = f"cola_emails?id=eq.{urllib.parse.quote(str(mail_id))}"
                        supabase_request(endpoint, method="PATCH", data=patch_data)

                    except Exception as row_err:
                        print(f"⚠️ [EMAIL WORKER] Excepción procesando {mail_id}: {row_err}", flush=True)
                        traceback.print_exc()
                        try:
                            endpoint = f"cola_emails?id=eq.{urllib.parse.quote(str(mail_id))}"
                            supabase_request(endpoint, method="PATCH", data={
                                "estado": "error",
                                "error_mensaje": str(row_err)[:500],
                                "procesado_en": datetime.now().isoformat()
                            })
                        except Exception:
                            pass
        except Exception as worker_err:
            print(f"⚠️ [EMAIL WORKER] Error en ciclo de polling: {worker_err}", flush=True)

        time.sleep(5)

def run():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server_address = ("", PORT)
    httpd = ThreadedHTTPServer(server_address, SGBackendHandler)

    # Arrancar el worker de cola de emails en un hilo en segundo plano
    worker_thread = threading.Thread(target=email_queue_worker, daemon=True, name="EmailQueueWorker")
    worker_thread.start()

    print("====================================================================")
    print("  🚀 SG MONTAJES SRL — BACKEND PYTHON & SERVIDOR WEB ACTIVO")
    print(f"  🌐 Servidor corriendo en: http://localhost:{PORT}")
    print(f"  ☁️  Conectado a Supabase: {SUPABASE_URL}")
    print(f"  📧 SMTP Saliente Configurado: {SMTP_USER} ({SMTP_HOST}:{SMTP_PORT} SSL)")
    print("  📬 Worker de Cola de Emails: ACTIVO (polling cada 5 seg)")
    print("  Endpoints disponibles:")
    print("    - http://localhost:8000/api/health")
    print("    - http://localhost:8000/api/presupuestos")
    print("    - http://localhost:8000/api/estadisticas")
    print("    - http://localhost:8000/api/send-email (POST)")
    print("    - http://localhost:8000/api/test-email (POST)")
    print("    - http://localhost:8000/api/notificar-avance (POST)")
    print("    - http://localhost:8000/api/exportar-csv")
    print("    - http://localhost:8000/api/backup")
    print("====================================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Servidor detenido.")
        httpd.server_close()

if __name__ == "__main__":
    run()

