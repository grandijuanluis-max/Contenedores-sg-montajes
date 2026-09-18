// Motor de Generación e Impresión de Remitos Oficiales — ACOSTA SERVICIOS SRL
window.generarRemitoHTML = function(cont, tipo = 'entrega') {
    const isEntrega = tipo === 'entrega';
    const nroRemito = `REM-${isEntrega ? 'ENT' : 'DEV'}-${cont.code}-${new Date().getFullYear()}`;
    const hoy = new Date().toLocaleDateString('es-AR');
    
    return `
    <div id="remito-print-area" class="remito-sheet">
        <!-- Encabezado Institucional -->
        <div class="remito-header-box" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #00529F; padding-bottom: 10px; margin-bottom: 15px;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <img src="logo_acosta.png" alt="ACOSTA SERVICIOS" style="height: 45px; width: auto; object-fit: contain;">
                <div>
                    <div style="font-size: 18px; font-weight: 900; color: #1e3a8a; letter-spacing: 0.5px;">ACOSTA SERVICIOS S.R.L.</div>
                    <div style="font-size: 10.5px; color: #475569;">Ingeniería & Montajes Industriales • Logística de Flota</div>
                    <div style="font-size: 9.5px; color: #64748b;">C.U.I.T.: 30-71868621-7 • I.V.A. Responsable Inscripto</div>
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 14px; font-weight: 800; color: ${isEntrega ? '#0284c7' : '#059669'}; text-transform: uppercase;">
                    ${isEntrega ? 'REMITO OFICIAL DE ENTREGA' : 'ACTA DE DEVOLUCIÓN Y RETIRO'}
                </div>
                <div style="font-size: 12px; font-weight: bold; font-family: monospace; color: #0f172a;">${nroRemito}</div>
                <div style="font-size: 10px; color: #64748b;">Fecha de emisión: ${hoy}</div>
            </div>
        </div>

        <!-- Ficha de Datos del Cliente y Obra -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px;">
            <tr style="background: #f1f5f9;">
                <td style="padding: 6px 8px; border: 1px solid #cbd5e1; width: 50%;">
                    <strong style="color: #1e3a8a;">CLIENTE / EMPRESA:</strong><br>
                    <span style="font-size: 13px; font-weight: bold;">${cont.cliente || 'ACOSTA SERVICIOS SRL (Uso Interno)'}</span>
                </td>
                <td style="padding: 6px 8px; border: 1px solid #cbd5e1; width: 50%;">
                    <strong style="color: #1e3a8a;">OBRA / DESTINO:</strong><br>
                    <span style="font-size: 12px;">${cont.ubicacion || 'Depósito Central — Sarandí'}</span>
                </td>
            </tr>
            <tr>
                <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">
                    <strong style="color: #64748b;">Fecha de Entrega:</strong> ${cont.entrega || hoy}
                </td>
                <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">
                    <strong style="color: #64748b;">Fecha de Retiro / Vencimiento:</strong> ${cont.retiro || 'A convenir'}
                </td>
            </tr>
        </table>

        <!-- Detalle del Contenedor -->
        <table class="remito-table">
            <thead>
                <tr>
                    <th style="width: 15%;">CÓDIGO</th>
                    <th style="width: 25%;">TIPO DE UNIDAD</th>
                    <th style="width: 15%;">MEDIDA</th>
                    <th style="width: 45%;">ESTADO Y EQUIPAMIENTO</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="font-family: monospace; font-size: 13px; font-weight: bold; text-align: center; color: #1e3a8a;">${cont.code}</td>
                    <td style="font-weight: bold;">Contenedor ${cont.tipo}</td>
                    <td style="text-align: center; font-weight: bold;">${cont.medida}</td>
                    <td>${cont.obsEntrega || 'Unidad entregada en condiciones operativas estándar.'}</td>
                </tr>
            </tbody>
        </table>

        <!-- Checklist de Inspección Técnica -->
        <div style="margin: 15px 0; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; background: #fafafa;">
            <div style="font-size: 11px; font-weight: bold; color: #1e3a8a; margin-bottom: 8px; text-transform: uppercase;">
                ✓ Checklist de Inspección en ${isEntrega ? 'Entrega en Obra' : 'Retiro / Recepción'}:
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; font-size: 10.5px;">
                <div>☑ 2 Juegos de llaves entregados</div>
                <div>☑ Instalación eléctrica y luminarias OK</div>
                <div>☑ Aire Acondicionado / Calefacción funcional</div>
                <div>☑ Piso, paredes y techo sin filtraciones</div>
                <div>☑ Cerraduras y barrales de seguridad OK</div>
                <div>☑ Limpieza general y estado de pintura óptimo</div>
            </div>
        </div>

        <!-- Observaciones -->
        <div style="margin-bottom: 20px; font-size: 10.5px;">
            <strong style="color: #0f172a;">Observaciones de ${isEntrega ? 'Despacho' : 'Recepción'}:</strong>
            <div style="border: 1px dashed #cbd5e1; padding: 8px; border-radius: 4px; min-height: 40px; margin-top: 4px; background: #ffffff;">
                ${isEntrega ? (cont.obsEntrega || 'Sin observaciones adicionales.') : (cont.obsRetiro || 'Recepción en conformidad.')}
            </div>
        </div>

        <!-- Firmas de Conformidad -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; padding-top: 15px; font-size: 11px;">
            <div style="text-align: center; width: 45%; border-top: 1px solid #0f172a; padding-top: 6px;">
                <strong>ACOSTA SERVICIOS S.R.L.</strong><br>
                <span style="font-size: 9.5px; color: #64748b;">Responsable de Logística y Despacho</span>
            </div>
            <div style="text-align: center; width: 45%; border-top: 1px solid #0f172a; padding-top: 6px;">
                <strong>${cont.cliente || 'RESPONSABLE DE RECEPCIÓN'}</strong><br>
                <span style="font-size: 9.5px; color: #64748b;">Firma, Aclaración y DNI en Obra</span>
            </div>
        </div>
    </div>
    `;
};

window.imprimirRemito = function(cont, tipo = 'entrega') {
    const html = window.generarRemitoHTML(cont, tipo);
    const modalEl = document.getElementById('modal-remito-viewer');
    const contentEl = document.getElementById('remito-viewer-body');
    if (modalEl && contentEl) {
        contentEl.innerHTML = html;
        modalEl.style.display = 'flex';
        window._currentRemitoData = { cont, tipo };
    }
};

window.descargarRemitoPDF = function() {
    const element = document.getElementById('remito-print-area');
    if (!element) return;
    
    const cont = window._currentRemitoData ? window._currentRemitoData.cont : { code: 'C-000' };
    const tipo = window._currentRemitoData ? window._currentRemitoData.tipo : 'entrega';
    const opt = {
        margin: [10, 10, 10, 10],
        filename: `Remito_${tipo.toUpperCase()}_${cont.code}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    if (typeof html2pdf !== 'undefined') {
        html2pdf().set(opt).from(element).save();
    } else {
        window.print();
    }
};
