<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Reporte de Ruta - {{ $route->id }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            color: #333;
            margin: 0;
            padding: 20px;
        }
        .header {
            width: 100%;
            border-bottom: 2px solid #2c3e50;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .header table {
            width: 100%;
            border: none;
        }
        .header td {
            vertical-align: middle;
            border: none;
        }
        .logo {
            max-width: 150px;
            max-height: 80px;
        }
        .company-info {
            text-align: right;
        }
        h1 {
            color: #2c3e50;
            font-size: 20px;
            margin: 0 0 5px 0;
        }
        h2 {
            font-size: 16px;
            margin: 0 0 10px 0;
            color: #555;
        }
        .section-title {
            background-color: #f2f2f2;
            padding: 5px 10px;
            font-weight: bold;
            margin-top: 20px;
            margin-bottom: 10px;
            border-left: 4px solid #3498db;
        }
        table.data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        table.data-table th, table.data-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            vertical-align: top;
        }
        table.data-table th {
            background-color: #f8f9fa;
            font-weight: bold;
            color: #333;
        }
        .status-badge {
            padding: 3px 6px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: bold;
            color: #fff;
            text-transform: uppercase;
        }
        .status-entregado { background-color: #2ecc71; }
        .status-pendiente { background-color: #f39c12; }
        .status-cancelado { background-color: #e74c3c; }
        .status-default { background-color: #95a5a6; }
        
        .footer {
            position: fixed;
            bottom: 0px;
            left: 0px;
            right: 0px;
            height: 30px;
            font-size: 10px;
            text-align: center;
            color: #777;
            border-top: 1px solid #ddd;
            padding-top: 5px;
        }
    </style>
</head>
<body>

    <div class="header">
        <table>
            <tr>
                <td style="width: 50%;">
                    @if($route->company && $route->company->logo)
                        <!-- If company has logo, use it (assumes public storage) -->
                        @php
                            $logoPath = public_path('storage/' . $route->company->logo);
                        @endphp
                        @if(file_exists($logoPath))
                            <img src="{{ $logoPath }}" alt="Logo" class="logo">
                        @else
                            <img src="{{ public_path('logo.png') }}" alt="dTrackers Logo" class="logo">
                        @endif
                    @else
                        <img src="{{ public_path('logo.png') }}" alt="dTrackers Logo" class="logo">
                    @endif
                </td>
                <td class="company-info">
                    <h1>{{ $route->company ? $route->company->name : 'dTrackers' }}</h1>
                    @if($route->company)
                        <p style="margin:2px 0;">NIT/RUT: {{ $route->company->tax_id ?? 'N/A' }}</p>
                        <p style="margin:2px 0;">{{ $route->company->address ?? '' }}</p>
                        <p style="margin:2px 0;">{{ $route->company->phone ?? '' }}</p>
                    @endif
                </td>
            </tr>
        </table>
    </div>

    <h2>REPORTE DE RUTA FINALIZADA #{{ str_pad($route->id, 5, '0', STR_PAD_LEFT) }}</h2>
    
    <div class="section-title">Información General</div>
    <table class="data-table">
        <tr>
            <th style="width: 25%;">Fecha de Ruta</th>
            <td style="width: 25%;">{{ \Carbon\Carbon::parse($route->date)->format('d/m/Y') }}</td>
            <th style="width: 25%;">Estado</th>
            <td style="width: 25%; text-transform: uppercase;"><strong>{{ $route->status }}</strong></td>
        </tr>
        <tr>
            <th>Chofer Asignado</th>
            <td>{{ $route->driver ? $route->driver->name : 'No asignado' }}</td>
            <th>Vehículo (Placas)</th>
            <td>{{ $route->truck ? $route->truck->license_plate : 'No asignado' }}</td>
        </tr>
        <tr>
            <th>Distancia Total</th>
            <td>{{ $route->total_distance_km ? $route->total_distance_km . ' km' : 'N/A' }}</td>
            <th>Hora de Inicio</th>
            <td>{{ $route->started_at ? $route->started_at->format('d/m/Y H:i') : 'N/A' }}</td>
        </tr>
    </table>

    <div class="section-title">Detalle de Despachos</div>
    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 25%;">Cliente / Dirección</th>
                <th style="width: 30%;">Productos Entregados</th>
                <th style="width: 30%;">Observaciones del Chofer</th>
                <th style="width: 10%;">Estado</th>
            </tr>
        </thead>
        <tbody>
            @forelse($route->dispatches as $index => $dispatch)
                @php
                    $statusClass = 'status-default';
                    if(strtolower($dispatch->status) == 'entregado') $statusClass = 'status-entregado';
                    if(strtolower($dispatch->status) == 'pendiente') $statusClass = 'status-pendiente';
                    if(strtolower($dispatch->status) == 'cancelado' || strtolower($dispatch->status) == 'rechazado') $statusClass = 'status-cancelado';
                @endphp
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>
                        <strong>{{ $dispatch->client ? $dispatch->client->name : 'Cliente Desconocido' }}</strong><br>
                        <span style="font-size: 10px; color: #555;">{{ $dispatch->client ? $dispatch->client->address : '' }}</span>
                    </td>
                    <td>
                        @if($dispatch->products && $dispatch->products->count() > 0)
                            <ul style="margin: 0; padding-left: 15px; font-size: 11px;">
                            @foreach($dispatch->products as $product)
                                <li>{{ $product->quantity }}x {{ $product->product_name }}</li>
                            @endforeach
                            </ul>
                        @else
                            <span style="color: #999; font-style: italic;">Sin detalles de productos</span>
                        @endif
                    </td>
                    <td>
                        {{ $dispatch->observation ?: '-' }}
                    </td>
                    <td style="text-align: center;">
                        <span class="status-badge {{ $statusClass }}">{{ $dispatch->status }}</span>
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="5" style="text-align: center;">No hay despachos registrados en esta ruta.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        Este documento fue generado automáticamente por dTrackers el {{ now()->format('d/m/Y H:i') }}.
    </div>

</body>
</html>
