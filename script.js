// Variables globales
var datafile = []; // Archivo final para descargar, contiene las líneas de asientos 
var datacliente = {};  // Ojbeto que almacena los datos de los clientes sacados del archivo csv
var numero = 0;
var datosexportar = {}; //

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

function crearArchivo()
{
  // Crea el archivo blob y una url para descargarlo  
  var blob = new Blob([datafile.join('\n')], {type:'text/html',endings:'native'});

  //crea una url para descargar el archivo
  url = window.URL.createObjectURL(blob);

  //crea un enlace oculto con el nombre del archivo, y lo descarga
  var a = document.createElement('a');
  a.style = 'display: none';
  a.href = url;
  a.download = 'SUENLACE.DAT';
  a.click();
  window.URL.revokeObjectURL(url);
}

async function traspasar()
{
  // Muestra spinner y oculta el formulario
  document.getElementById('cargando').classList.remove('d-none');
  document.getElementById('importador').classList.add('d-none');

  // Espera a que la función de importación de datos termine
  await getText('clientes.csv');
  
  // Crea una constante para el input del formulario
  const [file] = document.querySelector('input[type=file]').files;
  
  // Nueva instancia de FileReader
  const reader = new FileReader();
  
  let myPromise = new Promise(function(resolve)
  {
	reader.addEventListener(
    	'load',
    	() =>
      {
        // vacía el archivo de datos
        while (datafile.length > 0)
        {
          datafile.pop();
        }

        // Separa las líneas por el retorno de línea
        let lines = reader.result.split(/[\r\n]+/g);

        for (var i = 1; i < lines.length; i++) // la primera línea es la cabecera y no se cuenta
        { 
          if (lines[i].length != 0)
          {
            let fecha = lines[i].split('\t')[1];  //Fecha
            let fact = lines[i].split('\t')[2];   // Factura
            let numfactura= lines[i].split('\t')[3]; // Numero de la factura
            let factura = fact + '-' + numfactura;  
            let codigo = lines[i].split('\t')[4];  // Codigo de cliente en Grime
            let importe = lines[i].split('\t')[7]; // Importe
            let cobrador = lines[i].split('\t')[16]; // Número del repartidor
            
            if (lines[i].split('\t')[6] != 'H')   // Si la línea es más corta, la H no está en su lugar,
            {                                     // coge el siguiente tabulador como importe
              importe = lines[i].split('\t')[8];
            }

            let cuenta = ''; // Cuenta del cliente de A3, para rellenar después
            let nombre = 'No existe CIF - Código: ' + codigo;  // Nombre del cliente, para rellenar después

            // Si el código de cliente existe en el objeto de datos de clientes, asigna los datos a las variables
            if(typeof datacliente[codigo] !== 'undefined')  
            {
              cuenta = datacliente[codigo][0]; // Cuenta del cliente
              nombre = datacliente[codigo][1]; // Nombre del cliente
            }

            let contrapartida = lines[i].split('\t')[9]; // Cuenta de A3 para los cobros

            //// Construye el objeto que después se va a exportar
            // Si la propiedad no está definida, la crea vacía, si no la deja como está
            datosexportar[fecha] = datosexportar[fecha] || {};
            datosexportar[fecha][cobrador] = datosexportar[fecha][cobrador] || {};
            datosexportar[fecha][cobrador][contrapartida] = datosexportar[fecha][cobrador][contrapartida] || {};
            datosexportar[fecha][cobrador][contrapartida][factura] = [];
            datosexportar[fecha][cobrador][contrapartida][factura].push(importe,cuenta,nombre);
            
            numero += 1;  // Suma 1 a la fila, por cada fila
          }
        }
        
        // Ejecuta la función que añade cada línea en el objeto datos
        anadeLinea(datosexportar);

        // Esconde el spinner
        document.getElementById('cargando').classList.add('d-none');
        
        // Habilita los botones de Nuevo y Descargar
        document.getElementById('nuevo').classList.remove('d-none');
        document.getElementById('descargar').classList.remove('d-none');

        // Crea la tabla en el DOM según los datos del objeto
        crearTabla(datosexportar);
        
        // Termina el promise
        resolve();
    	},
    	false,
  	);

    // Si existe el archivo, lo lee como texto
    if (file)
    {
      reader.readAsText(file);
    };
  });  
}

function anadeLinea(objeto)
{
  for (let i in objeto)
  {
    for (let j in objeto[i])
    {
      for (let k in objeto[i][j])
      {
        // Crea el apunte de contrapartida del asiento, es el que abre el asiento y va en el Debe con el total del tipo de cobro
        
        let formato = '4';  // Formato del apunte, siempre 4
        let empresa = '00026'; // Código de empresa, 00026 es Bodega Gayda
        let fecha = i;  // Fecha formato dd/mm/aaa
        let registro = '0';  // Registro, siempre 0
        let cuenta = k;  // Cuenta del tipo de cobro
        let descripcion = ''; // Descripción de la cuenta, siempre vacío
        let tipo = 'D'; // En el Debe
        let referencia = 'L'; // Referencia del apunte
        let linea = 'I'; // Abre el asiento con la 'I'
        let apunte = 'COBROS ' + ' ' + nombreCobrador(j) + ' ' + fecha.substring(0,5); // Descripción del apunte, se usa 'COBORS FACTURAS + COBRADOR + DIA-MES
        let importe = 0; // Importe, después se le debe sumar cada importe de las líneas del asiento

        // Suma los importe del mismo asiento
        for (let l in objeto[i][j][k])
        {
          let cantidad = parseFloat(objeto[i][j][k][l][0].replace(',', '.')); // Convierte el importe en número
          importe += cantidad; // Lo suma al importe del asiento
          importe = (Math.round(importe * 100) / 100); // Redondea en dos decimales
        };
        importe = importe.toFixed(2); // Convierte el número en texto
        let relleno = '';  
        while ((relleno.length + importe.length) < 13) // Añade '0' por delante hasta llegar a 12 caracteres
        {
          relleno += '0';
        }
        importe = '+' + relleno  + importe; // El importe final en formato A3

        let reserva = ''; // Carácteres de reserva usados por A3, normalmente vacíos
        let moneda = 'E'; // Moneda en euros
        let indicador = 'N'; // Indicador de asiento no procesado 'N'
        
        // Inserta la línea en el objeto de archivo
        datafile.push(createLine(formato,empresa,fecha,registro,cuenta,descripcion,tipo,referencia,linea,apunte,importe,reserva,moneda,indicador));

        let facturaTotales = 0;
        
        for (let l in objeto[i][j][k])
        {
          facturaTotales += 1;

          let formato = '4';
          let empresa = '00026';
          let fecha = i;
          let registro = '0';
          let cuenta = objeto[i][j][k][l][1];
          let descripcion = '';
          let tipo = 'H';
          let referencia = l;

          let linea = 'M';
          
          if (facturaTotales === Object.keys(objeto[i][j][k]).length)
          {
            linea = 'U';
          }

          let apunte = 'COBRO ' + l + ' ' + objeto[i][j][k][l][2];
          
          let importe = objeto[i][j][k][l][0];
          let signo = '+';

          if (importe.substring(0,1) === '-')
          {
            signo = '-';
            importe = importe.replace('-','');
          };

          importe = importe.toString().replace(',','.'); // Convierte el importe en texto
          let relleno = ''; 
          while ((relleno.length + importe.length) < 13) // Rellena el principio de la cadena con '0' hasta la longitud de doce 
          {
            relleno += '0';
          }
          importe = signo + relleno  + importe; // Junta el relleno con el importe

          console.log(importe);

          let reserva = '';
          let moneda = 'E';
          let indicador = 'N';
          
          datafile.push(createLine(formato,empresa,fecha,registro,cuenta,descripcion,tipo,referencia,linea,apunte,importe,reserva,moneda,indicador));
        };
      };
    };
  };
  console.log(objeto);
}

function createLine(formato,empresa,fecha,registro,cuenta,descripcion,tipo,referencia,linea,apunte,importe,reserva,moneda,indicador)
{
  let finalLine = '';
  finalLine += formato; // Constante '4'
  finalLine += empresa; // Constante '00026' - Bodega Gayda
  finalLine += fecha.slice(6, 10);  // año
  finalLine += fecha.slice(3, 5);   // mes
  finalLine += fecha.slice(0, 2);   // dia
  finalLine += registro; 			    // Tipo de registro constante '0'

  while (cuenta.length < 12) // Cuenta contable 
  {
    cuenta += '0';
  }
  finalLine += cuenta;     

  while (descripcion.length < 30) { // Descripción cuenta, normalmente vacío
      descripcion += ' ';
  }
  finalLine += descripcion;

  finalLine += tipo; 	// Tipo de importe D/H
  
	while (referencia.length < 10) { // Referencia del Documento, es el número de factura
  	referencia += ' ';
	}
  finalLine += referencia;
  
  finalLine += linea;	//I = Inicio apunte (Primera línea del asiento)  M = Medio apunte (Líneas intermedias)  U = Ultimo

  apunte = apunte.substring(0,29); // Descripción del apunte, 'PAGO + factura + nombre'
	while (apunte.length < 30) {
  	apunte += ' ';
	}
  finalLine += apunte;
  
  finalLine += importe;
  
  while (reserva.length < 139) {
  	reserva += ' ';
	}
  finalLine += reserva;
  
  finalLine += moneda;		// Moneda 'E', euros
  finalLine += indicador; // 'N', no generado
  
  return finalLine;
}

function crearTabla(objeto)
{
  let content = document.getElementById('content');

  for (let i in objeto)  //Crea una tabla por cada fecha
  {
    content.innerHTML +=
    `
    <h4 class="text-start">${i.substring(0,10)}</h4>
    <table id="${i.substring(0,10)}" class="table table-hover table-dark mb-5">
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">Cobrador</th>
          <th scope="col" class="text-end">Total</th>
        </tr>
      </thead>
      <tbody id="tabla${i.substring(0,10)}">
      </tbody>
    </table>
    `;
  
    let numeroCobrador = 0;

    for (let j in objeto[i]) //Crea una tabla por cada cobrador
    {
      
      let tabla = document.getElementById('tabla' + i.substring(0,10));
      numeroCobrador++;

      tabla.innerHTML +=
      `
      <tr class="table-secondary">
        <td>${numeroCobrador}</td>
        <td>${nombreCobrador(j)}</td>
        <td class="text-end" id="${'total' + i.substring(0,10) + j}"></td>
      </tr>
      <tr>
        <td id="${'pago' + i.substring(0,10) + j}"colspan="4">
        </td>
      </tr>
      `

      let tot = 0; //Total cobrador, se completa más abajo 

      for (let k in objeto[i][j]) // Crea una tabla por cada contrapartida
      {
        let pago = document.getElementById('pago' + i.substring(0,10) + j);

        pago.innerHTML +=
        `
        <table class="table table-hover table-dark mb-5">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">${k}</th>
            <th scope="col"></th>
            <th scope="col" class="text-end" id="${'subtotal' + i.substring(0,10) + j + k}"></th>
          </tr>
        </thead>
        <tbody id="${'factura' + i.substring(0,10) + j + k}">
        </tbody>
      </table>
        `
        subtot = 0;

        for (let l in objeto[i][j][k]) // Crea una tabla por cada contrapartida
        {
          let factura = document.getElementById('factura' + i.substring(0,10) + j + k);

          factura.innerHTML +=
          `<tr class="colspan-4">
            <td scope="row">${l}</td>
            <td class="${pintaVacio(objeto[i][j][k][l][1])}">${objeto[i][j][k][l][1]}</td>
            <td>${objeto[i][j][k][l][2]}</td>
            <td class="text-end">${objeto[i][j][k][l][0]}€</td>
          </tr>`;

          // Calcula el total y el subtotal
          let subtotal = document.getElementById('subtotal' + i.substring(0,10) + j + k);
          let cantidad = parseFloat(objeto[i][j][k][l][0].replace(',', '.'));
          subtot += cantidad;
          subtot = (Math.round(subtot * 100) / 100);
          subtotal.innerHTML = subtot.toFixed(2) + '€';

          let total = document.getElementById('total' + i.substring(0,10) + j);
          tot += cantidad;
          tot = (Math.round(tot * 100) / 100);
          total.innerHTML = tot.toFixed(2) + '€';
        };
      };
    };
  };
}

function nombreCobrador(nombre)
{
  switch (nombre) {
    case '1':
      text = 'María Reyes';
      break;
    case '2':
      text = 'Juan Álvarez';
      break;
    case '3':
      text = 'Yonatan Marrero';
      break;
    case '4':
      text = 'Manuel González';
      break;
    case '5':
      text = 'Dani';
      break;
    case '6':
      text = 'Geovanna';
      break;           
    case '7':
      text = 'Miguel';
      break;
    case '9':
      text = 'Ginna';
      break;      
    case '10':
      text = 'Tino';
      break;
    case '11':
      text = 'Raúl Cabañas';
      break;
    case '12':
      text = 'Camión';
      break;
    case '13':
      text = 'Christian Alayón';
      break;           
    case '16':
      text = 'Juan García';
      break;
    case '99':
      text = 'Transferencias';
      break;                         
    default:
      text = 'Sin nombre';
  }
  return text;
}

function pintaVacio(valor)
{
  if (valor =='' || !valor || valor =='No existe CIF')
  {
    return 'bg-warning'
  }
}