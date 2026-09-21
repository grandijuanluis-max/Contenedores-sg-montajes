// Motor de Generación e Impresión de Remitos — ACOSTA SERVICIOS SRL & SG MONTAJES SRL
window.generarRemitoHTML = function(cont, tipo = 'entrega') {
    const isEntrega = tipo === 'entrega';
    const nroRemito = `REM-${isEntrega ? 'ENT' : 'DEV'}-${cont.code}-${new Date().getFullYear()}`;
    const hoy = new Date().toLocaleDateString('es-AR');
    
    // Detección estricta del Proveedor seleccionado
    const prov = (cont.proveedor || '').toUpperCase();
    const isSg = prov.includes('SG') || prov.includes('MONTAJES');
    
    const empNombre = isSg ? 'SG MONTAJES S.R.L.' : 'ACOSTA SERVICIOS S.R.L.';
    const empCuit = isSg ? '30-71602466-7' : '30-71868621-7';
    const empColor = isSg ? '#00529F' : '#1e3a8a';
    const empBorder = isSg ? '#F3B229' : '#0284c7';
    
    // Logos preferentemente en Base64 para evitar errores de CORS con html2pdf
    let empLogoSrc = isSg 
        ? (window.LOGO_SG_BASE64 || 'logo_sg_montajes.png') 
        : (window.LOGO_ACOSTA_BASE64 || 'logo_acosta.png');
        
    const empSub = isSg 
        ? 'Montajes Electromecánicos • Obras Industriales • Logística de Flota' 
        : 'Ingeniería & Montajes Industriales • Logística de Flota';
    const empDireccion = 'Estanislao López (CP S2204) — Timbúes, Santa Fe';
    
    // Título solicitado explícitamente: "REMITO NO OFICIAL"
    const tituloRemito = isEntrega ? 'REMITO NO OFICIAL DE ENTREGA' : 'REMITO NO OFICIAL DE RETIRO';

    return `
    <div id="remito-print-area" class="remito-sheet" style="background: #ffffff; color: #0f172a; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <!-- Encabezado Institucional Dinámico -->
        <div class="remito-header-box" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid ${empBorder}; padding-bottom: 12px; margin-bottom: 15px;">
            <div style="display: flex; align-items: center; gap: 14px;">
                <img src="${empLogoSrc}" alt="${empNombre}" style="height: 52px; max-height: 52px; width: auto; max-width: 180px; object-fit: contain;">
                <div>
                    <div style="font-size: 19px; font-weight: 900; color: ${empColor}; letter-spacing: 0.5px;">${empNombre}</div>
                    <div style="font-size: 11px; color: #475569; margin-top: 1px;">${empSub}</div>
                    <div style="font-size: 10px; color: #64748b; margin-top: 1px;">${empDireccion} • C.U.I.T.: ${empCuit} • I.V.A. Resp. Inscripto</div>
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 13px; font-weight: 900; color: #dc2626; text-transform: uppercase; letter-spacing: 0.5px; border: 1.5px solid #dc2626; padding: 2px 8px; border-radius: 4px; display: inline-block; margin-bottom: 4px;">
                    ${tituloRemito}
                </div>
                <div style="font-size: 12px; font-weight: bold; font-family: monospace; color: #0f172a;">${nroRemito}</div>
                <div style="font-size: 10px; color: #64748b;">Fecha de emisión: ${hoy}</div>
            </div>
        </div>

        <!-- Ficha de Datos del Cliente y Obra -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11.5px;">
            <tr style="background: #f8fafc;">
                <td style="padding: 8px 10px; border: 1px solid #cbd5e1; width: 50%;">
                    <strong style="color: ${empColor};">CLIENTE / EMPRESA:</strong><br>
                    <span style="font-size: 13px; font-weight: 800; color: #0f172a;">${cont.cliente || (empNombre + ' (Uso Interno)')}</span>
                </td>
                <td style="padding: 8px 10px; border: 1px solid #cbd5e1; width: 50%;">
                    <strong style="color: ${empColor};">OBRA / DESTINO:</strong><br>
                    <span style="font-size: 12px; font-weight: 600; color: #0f172a;">${cont.ubicacion || 'Base Operativa Timbúes — Estanislao López'}</span>
                </td>
            </tr>
            <tr>
                <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">
                    <strong style="color: #64748b;">Fecha de Entrega / Salida:</strong> <span style="font-weight: 600;">${cont.entrega || hoy}</span>
                </td>
                <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">
                    <strong style="color: #64748b;">Fecha de Retiro / Vencimiento:</strong> <span style="font-weight: 600;">${cont.retiro || 'A convenir'}</span>
                </td>
            </tr>
        </table>

        <!-- Detalle del Contenedor -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11.5px;">
            <thead>
                <tr style="background: ${empColor}; color: #ffffff;">
                    <th style="padding: 6px 8px; border: 1px solid #cbd5e1; width: 18%; text-align: center;">CÓDIGO</th>
                    <th style="padding: 6px 8px; border: 1px solid #cbd5e1; width: 25%; text-align: left;">TIPO DE UNIDAD</th>
                    <th style="padding: 6px 8px; border: 1px solid #cbd5e1; width: 15%; text-align: center;">MEDIDA</th>
                    <th style="padding: 6px 8px; border: 1px solid #cbd5e1; width: 42%; text-align: left;">ESTADO / EQUIPAMIENTO</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 10px 8px; border: 1px solid #cbd5e1; font-family: monospace; font-size: 14px; font-weight: 900; text-align: center; color: ${empColor};">${cont.code}</td>
                    <td style="padding: 10px 8px; border: 1px solid #cbd5e1; font-weight: 700;">Contenedor ${cont.tipo}</td>
                    <td style="padding: 10px 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: 700;">${cont.medida}</td>
                    <td style="padding: 10px 8px; border: 1px solid #cbd5e1; color: #334155;">${cont.obsEntrega || cont.observaciones || 'Unidad despachada en óptimas condiciones de operatividad y limpieza.'}</td>
                </tr>
            </tbody>
        </table>

        <!-- Checklist de Inspección Técnica -->
        <div style="margin: 15px 0; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; background: #fafafa;">
            <div style="font-size: 11px; font-weight: bold; color: ${empColor}; margin-bottom: 8px; text-transform: uppercase;">
                ✓ Checklist de Inspección (${isEntrega ? 'Salida de Base y Entrega' : 'Retiro y Reingreso a Base'}):
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; font-size: 10.5px; color: #1e293b;">
                <div>☑ 2 Juegos de llaves entregados</div>
                <div>☑ Instalación eléctrica y luminarias LED OK</div>
                <div>☑ Equipo de Aire Acondicionado / Calefacción funcional</div>
                <div>☑ Piso fenólico, paneles y techo sin filtraciones</div>
                <div>☑ Cerraduras y barrales de seguridad testeados</div>
                <div>☑ Limpieza general y estado de pintura óptimo</div>
            </div>
        </div>

        <!-- Observaciones -->
        <div style="margin-bottom: 25px; font-size: 11px;">
            <strong style="color: #0f172a;">Observaciones de Despacho:</strong>
            <div style="border: 1px dashed #cbd5e1; padding: 8px; border-radius: 4px; min-height: 38px; margin-top: 4px; background: #ffffff; color: #475569;">
                ${(cont.traslado === 'si' || cont.traslado === true) ? `<div style="margin-bottom: 4px; font-weight: bold; color: #0284c7;">🚚 Traslado Adicional: SÍ ${(cont.trasladoMonto || cont.trasladoHoras) ? `(Monto: ${cont.trasladoMonto || '-'} | Horas: ${cont.trasladoHoras || '-'})` : ''}</div>` : ''}
                ${isEntrega ? (cont.obsEntrega || cont.observaciones || 'Sin observaciones adicionales.') : (cont.obsRetiro || 'Recepción en conformidad en base operativa.')}
            </div>
        </div>

        <!-- Firmas de Conformidad -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 50px; padding-top: 15px; font-size: 11px;">
            <div style="text-align: center; width: 42%; border-top: 1.5px solid #0f172a; padding-top: 6px;">
                <strong style="color: #0f172a;">${empNombre}</strong><br>
                <span style="font-size: 9.5px; color: #64748b;">Responsable de Logística y Despacho</span>
            </div>
            <div style="text-align: center; width: 42%; border-top: 1.5px solid #0f172a; padding-top: 6px;">
                <strong style="color: #0f172a;">${cont.cliente || 'RESPONSABLE EN OBRA'}</strong><br>
                <span style="font-size: 9.5px; color: #64748b;">Firma, Aclaración y DNI en Conformidad</span>
            </div>
        </div>
    </div>
    `;
};

window.imprimirRemito = function(cont, tipo = 'entrega') {
    const html = window.generarRemitoHTML(cont, tipo);
    const modalEl = document.getElementById('modal-remito-viewer');
    const contentEl = document.getElementById('remito-viewer-body');
    const titleEl = document.getElementById('modal-remito-title');
    
    const prov = (cont.proveedor || '').toUpperCase();
    const isSg = prov.includes('SG') || prov.includes('MONTAJES');
    const empNombre = isSg ? 'SG MONTAJES SRL' : 'ACOSTA SERVICIOS SRL';
    
    if (titleEl) {
        titleEl.innerHTML = `<i class="fas fa-file-invoice"></i> Remito NO Oficial — ${empNombre}`;
    }
    
    if (modalEl && contentEl) {
        contentEl.innerHTML = html;
        modalEl.style.display = 'flex';
        window._currentRemitoData = { cont, tipo };
    }
};

window.descargarRemitoPDF = function() {
    const element = document.getElementById('remito-print-area');
    if (!element) {
        alert("No se encontró el remito para generar el PDF.");
        return;
    }
    
    const cont = window._currentRemitoData ? window._currentRemitoData.cont : { code: 'C-000' };
    const tipo = window._currentRemitoData ? window._currentRemitoData.tipo : 'entrega';
    const prov = (cont.proveedor || '').toUpperCase();
    const isSg = prov.includes('SG') || prov.includes('MONTAJES');
    const empSlug = isSg ? 'SG_Montajes' : 'Acosta_Servicios';
    
    const filename = `Remito_${tipo.toUpperCase()}_${cont.code}_${empSlug}.pdf`;
    
    const opt = {
        margin: [8, 8, 8, 8],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2, 
            useCORS: true,
            logging: false,
            letterRendering: true
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    if (typeof html2pdf !== 'undefined') {
        // Feedback visual en el botón de descarga
        const btn = document.querySelector('#modal-remito-viewer .btn-success, #modal-remito-viewer button[onclick*="descargarRemitoPDF"]');
        const origText = btn ? btn.innerHTML : '';
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando PDF...';
            btn.disabled = true;
        }
        
        html2pdf().set(opt).from(element).save().then(() => {
            if (btn) {
                btn.innerHTML = origText;
                btn.disabled = false;
            }
        }).catch(err => {
            console.error("Error con html2pdf:", err);
            if (btn) {
                btn.innerHTML = origText;
                btn.disabled = false;
            }
            window.print();
        });
    } else {
        window.print();
    }
};
