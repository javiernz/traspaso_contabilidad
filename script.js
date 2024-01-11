// Variables
let datafile = [];
let datacliente = {};
let numero = 0;

async function getText(file) {
  // Carga el archivo de texto y rellena el objecto dataclientes con los datos

  let myObject = await fetch(file);
  let myText = await myObject.text();
  let lines = myText.split(/[\r\n]+/g)
   
  for (var i = 0; i < lines.length; i++) // Por cada línea, separa por ';' y lo añade al objeto
  { 
    let cif = lines[i].split(';')[0];
    let cuenta = lines[i].split(';')[3];
    let nombre = lines[i].split(';')[1];

    datacliente[cif] = datacliente[cif] || [];
    datacliente[cif].push(cuenta);
    datacliente[cif].push(nombre);
  }
}

function createFile()
{
  var blob = new Blob([datafile.join('\n')], {type:'text/html',endings:'native'});

  //create a ObjectURL in order to download the created file
  url = window.URL.createObjectURL(blob);

  //create a hidden link and set the href and click it
  var a = document.createElement('a');
  a.style = 'display: none';
  a.href = url;
  a.download = 'SUENLACE.DAT';
  a.click();
  window.URL.revokeObjectURL(url);
}

async function myDisplay()
{
  // Muestra spinner y oculta el formulario
  document.getElementById('cargando').classList.remove('d-none');
  document.getElementById('importador').classList.add('d-none');

  await getText('clientes.csv');
  
  const [file] = document.querySelector('input[type=file]').files;
  
  // Nueva instancia de FileReader
  const reader = new FileReader();
  
  let myPromise = new Promise(function(resolve)
  {
	reader.addEventListener(
    	'load',
    	() => {
        
        ////////////////////////////////////////////

        // vacía el archivo de datos
        while (datafile.length > 0)
        {
          datafile.pop();
        }

        let lines = reader.result.split(/[\r\n]+/g);

        for (var i = 0; i < lines.length; i++)
        { 
        
          if (lines[i].length != 0)
          {
            let fecha = lines[i].split('\t')[1];
            let factura = lines[i].split('\t')[2];
            let numfactura= lines[i].split('\t')[3];
            let codigo = lines[i].split('\t')[4];
            let apunte = 'I';
            let tipo = 'H';
            let importe = lines[i].split('\t')[7];
            
            if (lines[i].split('\t')[6] != 'H')   // Si la línea es más corta, la H no está en su lugar,
            {                                     // coge el siguiente tabulador como importe
              importe = lines[i].split('\t')[8];
            }

            let cuenta = '';
            let nombre = 'No existe CIF';

            if(typeof datacliente[codigo] !== 'undefined')
            {
              cuenta = datacliente[codigo][0]; // Cuenta del cliente
              nombre = datacliente[codigo][1]; // Nombre del cliente
            }
            
              let contrapartida = lines[i].split('\t')[9];
            
            numero += 1;
            insertarLinea(numero,fecha,nombre,factura,numfactura,cuenta,contrapartida,importe);

            // Crea el asiento de contrapartida
            datafile.push(createLine(fecha,factura,numfactura,apunte,tipo,importe,cuenta,nombre));

            // Crea el asiento con la información de Grime
            apunte = 'U';
            tipo = 'D';            
            cuenta = lines[i].split('\t')[9];
            datafile.push(createLine(fecha,factura,numfactura,apunte,tipo,importe,cuenta,nombre));
          }

          // Esconde el spinner
          document.getElementById('cargando').classList.add('d-none');
          
          // Habilita el botón descargar
          document.getElementById('nuevo').classList.remove('d-none');
          document.getElementById('descargar').classList.remove('d-none');
          document.getElementById('tabla').classList.remove('d-none');
        }
        ////////////////////////////////////////
        
        // resolve(reader.result);
        resolve('Terminado');

    	},
    	false,
  	);

    if (file)
    {
      reader.readAsText(file);
    };

  });  
}

function createLine(fecha,factura,numfactura,apunte,tipo,importe,cuenta,nombre){
    let finalLine = '';
    finalLine += '4';
    finalLine += '00026';
    finalLine += fecha.slice(6, 10);  // año
    finalLine += fecha.slice(3, 5);   // mes
    finalLine += fecha.slice(0, 2);   // dia
    finalLine += '0'; 			    // Tipo de registro constante 0

    while (cuenta.length < 12) // Cuenta contable 
    {
      cuenta += '0';
    }
    finalLine += cuenta;     

    let descripcioncuenta = ''; // Descripción cuenta
    while (descripcioncuenta.length < 30) {
        descripcioncuenta += ' ';
    }
    finalLine += descripcioncuenta;

    finalLine += tipo; 							// Tipo de importe D/H
  
  let referencia = factura + '-' + numfactura; // Referencia del Documento
	while (referencia.length < 10) {
  	referencia += ' ';
	}
  finalLine += referencia;
  
  finalLine += apunte;				// Línea de apunte

  let descripcion = 'PAGO' + ' ' + factura + '-' + numfactura + ' ' + nombre; // Descripción del apunte
  descripcion = descripcion.substring(0,29);
	while (descripcion.length < 30) {
  	descripcion += ' ';
	}
  finalLine += descripcion;
  
  let relleno = ''; // Descripción del apunte
	while ((relleno.length + importe.length) < 13) {
  	relleno += '0';
	}
  finalLine += '+' + relleno  + importe.replace(',','.');
  
  let reserva = ''; // Reserva
	while (reserva.length < 139) {
  	reserva += ' ';
	}
  finalLine += reserva;
  
  finalLine += 'EN';		// Moneda enlace y Indicador generado
  
  return finalLine;
}

function pintaVacio(valor)
{
  if (valor =='' || !valor || valor =='No existe CIF')
  {
    return 'bg-warning'
  }
}

function insertarLinea(numero,fecha,nombre,factura,numfactura,cuenta,contrapartida,importe)
{
  document.getElementById('cuerpotabla').innerHTML += 
  `<tr>
    <th scope="row">${numero}</th>
    <td class="${pintaVacio(fecha)}">${fecha}</td>
    <td class="${pintaVacio(nombre)}">${nombre}</td>
    <td class="${pintaVacio(factura)}">${factura}-${numfactura}</td>
    <td class="${pintaVacio(cuenta)}">${cuenta}</td>
    <td class="${pintaVacio(contrapartida)}">${contrapartida}</td>
    <td class="${pintaVacio(importe)}">${importe}€</td>                    
  </tr>`;
}