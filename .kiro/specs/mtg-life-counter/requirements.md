# Requirements Document

## Introduction

MTG Life Counter es una aplicación web multijugador para rastrear puntos de vida en partidas de Magic: The Gathering. Permite a los jugadores crear salas con códigos compartibles, sincronizar contadores de vida en tiempo real mediante WebSockets, buscar e integrar arte de comandantes desde Scryfall, y llevar un historial completo de partidas con estadísticas. Soporta formatos de juego (Commander con 40 vida, 20 vida estándar, y Custom con vida configurable), contadores de veneno opcionales, y un modo de sala local para uso sin múltiples cuentas. Incluye selección aleatoria del jugador inicial con animación, detección automática del último jugador en pie, registro de causa de eliminación, historial editable de partidas, registro de comandantes/mazos, contador de turnos opcional, y exportación CSV de estadísticas. Está diseñada para funcionar en dispositivos móviles y escritorio, permitiendo hasta 12 jugadores conectados simultáneamente por sala.

## Glossary

- **Sistema**: La aplicación MTG Life Counter en su conjunto (frontend + backend)
- **Servidor**: El backend FastAPI que gestiona WebSockets, autenticación y persistencia
- **Cliente**: La aplicación React en el navegador del jugador
- **Sala**: Una instancia de partida identificada por un código único de 6 caracteres alfanuméricos
- **Sala_Local**: Una sala creada por un único usuario autenticado donde los jugadores adicionales son añadidos localmente sin necesidad de cuentas propias
- **Jugador**: Un participante dentro de una sala activa
- **Jugador_Local**: Un participante sin cuenta propia, añadido por el creador de una Sala_Local
- **Contador_de_Vida**: El componente que muestra y permite modificar los puntos de vida de un jugador
- **Contador_de_Veneno**: El componente que muestra y permite modificar los contadores de veneno de un jugador cuando está habilitado en la configuración de la sala
- **Daño_de_Comandante**: El registro de daño de combate infligido por cada comandante a cada jugador
- **Room_Manager**: El módulo del servidor que gestiona el estado de las salas y la comunicación WebSocket
- **Scryfall_Service**: El servicio de integración con la API de Scryfall para búsqueda de cartas
- **Motor_de_Autenticación**: El módulo que gestiona registro, login y tokens JWT
- **Módulo_de_Historial**: El componente que almacena y consulta partidas finalizadas
- **Módulo_de_Estadísticas**: El componente que calcula y presenta estadísticas del jugador
- **Selector_de_Jugador_Inicial**: El componente que selecciona aleatoriamente un jugador para iniciar la partida mediante una animación visual
- **Causa_de_Eliminación**: El registro del motivo por el cual un jugador fue eliminado de la partida (daño normal, daño de comandante, o veneno)
- **Registro_de_Comandantes**: El módulo que almacena y consulta los comandantes/mazos utilizados por cada usuario a lo largo de todas sus partidas
- **Editor_de_Historial**: El panel que permite al usuario autenticado corregir datos de partidas finalizadas (causa de eliminación y orden de eliminación)
- **Exportador_CSV**: El componente que genera archivos CSV a partir de las tablas de estadísticas del usuario
- **Colección_de_Mazos**: El módulo que permite al usuario registrar, consultar y gestionar sus mazos personales ("Mis Mazos") para reutilizarlos al unirse a partidas
- **Mazo**: Una entrada en la colección personal del usuario que identifica un mazo por su comandante (formato Commander) o por un nombre personalizado (otros formatos), con formato y estado asociados
- **Partner**: Habilidad de ciertas cartas legendarias de Magic que permite a un jugador designar dos comandantes en lugar de uno solo
- **Par_de_Partners**: Un par de cartas legendarias con la habilidad Partner designadas como co-comandantes de un mismo mazo
- **Estadísticas_por_Mazo**: Las métricas calculadas para cada mazo registrado: total de partidas, victorias, porcentaje de victorias, y jugadores que han utilizado ese mazo
- **Estadísticas_por_Rival**: Las métricas calculadas para cada rival contra el que el usuario ha jugado: total de partidas, victorias, porcentaje de victorias
- **Registro_de_Partida**: Una fila en el log de partidas que incluye fecha, jugadores, mazos utilizados y posición de eliminación de cada jugador

## Requirements

### Requirement 1: Creación de Salas

**User Story:** Como jugador, quiero crear una sala de partida con un código único, para que otros jugadores puedan unirse a mi partida.

#### Acceptance Criteria

1. WHEN un jugador selecciona "Crear Sala", THE Sistema SHALL generar un código único de 6 caracteres compuesto exclusivamente por letras mayúsculas (A-Z) y dígitos (0-9), y verificar que no exista una sala activa con el mismo código antes de asignarlo
2. WHEN un jugador crea una sala, THE Sistema SHALL presentar un selector de formato de juego con las opciones Commander (40 vida), 20 vida, y Custom (donde el usuario ingresa un valor de vida inicial personalizado), siendo Commander el formato seleccionado por defecto
3. WHEN la sala es creada, THE Sistema SHALL redirigir al jugador a la pantalla de partida con el código de sala pre-rellenado en un máximo de 2 segundos
4. WHEN un jugador crea una sala con un formato seleccionado, THE Sistema SHALL asignar la vida inicial correspondiente al formato: 40 para Commander, 20 para la opción "20 vida", y el valor ingresado por el usuario para Custom
5. THE Sistema SHALL permitir un máximo de 12 jugadores conectados simultáneamente por sala
6. WHEN un jugador crea una sala, THE Sistema SHALL presentar una opción configurable para habilitar o deshabilitar contadores de veneno, estando deshabilitada por defecto
7. WHEN un jugador crea una sala, THE Sistema SHALL presentar una opción configurable para habilitar o deshabilitar el contador de turnos, estando deshabilitada por defecto

### Requirement 2: Unión a Salas

**User Story:** Como jugador, quiero unirme a una sala existente ingresando un código, para que pueda participar en una partida con otros jugadores.

#### Acceptance Criteria

1. WHEN un jugador ingresa un código de sala de exactamente 6 caracteres alfanuméricos en mayúsculas que corresponde a una sala existente, THE Sistema SHALL permitir el acceso a la sala y mostrar el formulario de ingreso de datos del jugador
2. IF un jugador ingresa un código de sala con formato inválido o que no corresponde a una sala existente, THEN THE Sistema SHALL mostrar un mensaje de error indicando que la sala no fue encontrada y permanecer en la pantalla de unión
3. WHEN un jugador se une a una sala, THE Sistema SHALL solicitar un nombre de jugador obligatorio con una longitud entre 1 y 30 caracteres
4. WHEN el formato de la sala es Commander, THE Sistema SHALL presentar un buscador de comandantes que permita buscar cartas legendarias por nombre antes de confirmar la unión
5. WHEN un jugador completa los datos requeridos y selecciona "Unirse", THE Cliente SHALL establecer una conexión WebSocket con el Servidor en un plazo máximo de 5 segundos
6. IF la conexión WebSocket falla o no se establece dentro de 5 segundos, THEN THE Sistema SHALL mostrar un indicador de error de conexión y permitir al jugador reintentar la unión
7. IF un jugador intenta unirse sin proporcionar un nombre, THEN THE Sistema SHALL deshabilitar el botón de unión

### Requirement 3: Sincronización en Tiempo Real

**User Story:** Como jugador, quiero que los cambios de vida se sincronicen instantáneamente entre todos los dispositivos, para que todos los jugadores vean el estado actualizado de la partida.

#### Acceptance Criteria

1. WHEN un jugador se conecta a una sala, THE Servidor SHALL enviar el estado completo de la sala (vida actual de cada jugador, daño de comandante, estado de conexión, nombre de comandante e imagen, y contador de turnos si está habilitado) a todos los jugadores conectados en un máximo de 2 segundos desde la conexión
2. WHEN un jugador ajusta puntos de vida, THE Cliente SHALL enviar la acción al Servidor mediante WebSocket y el Servidor SHALL retransmitir el estado actualizado a todos los jugadores conectados en un máximo de 1 segundo desde la recepción de la acción
3. IF el Cliente no tiene una conexión WebSocket activa al intentar enviar una acción, THEN THE Cliente SHALL encolar la acción localmente y reintentar el envío durante un máximo de 3 intentos con 2 segundos de intervalo entre cada intento
4. WHILE un jugador está conectado a una sala, THE Cliente SHALL mostrar un indicador visual de estado de conexión (verde para conectado, rojo para error, amarillo pulsante para conectando)
5. IF un jugador se desconecta (cierre de conexión WebSocket o ausencia de respuesta durante 30 segundos), THEN THE Servidor SHALL marcar al jugador como desconectado y notificar a los demás jugadores en un máximo de 5 segundos
6. WHEN un jugador previamente desconectado se reconecta a la misma sala dentro de los 30 minutos posteriores a la desconexión, THE Servidor SHALL restaurar el estado completo del jugador (vida, daño de comandante acumulado y nombre de comandante) y retransmitir el estado actualizado a todos los jugadores conectados
7. IF un jugador no se reconecta dentro de los 30 minutos posteriores a la desconexión, THEN THE Servidor SHALL mantener los datos del jugador en la sala con estado desconectado hasta que la sala sea eliminada por inactividad
8. IF la sala alcanza el número máximo de 12 jugadores conectados simultáneamente, THEN THE Servidor SHALL rechazar nuevas conexiones e indicar al Cliente que la sala está llena

### Requirement 4: Contador de Vida

**User Story:** Como jugador, quiero incrementar o decrementar puntos de vida de cualquier jugador, para que pueda rastrear los cambios de vida durante la partida.

#### Acceptance Criteria

1. THE Contador_de_Vida SHALL mostrar los puntos de vida actuales de cada jugador en formato numérico con un tamaño de fuente mínimo de 48px
2. THE Contador_de_Vida SHALL proporcionar botones de incremento (+1) y decremento (-1) para cada jugador, con un área táctil mínima de 44x44px
3. WHEN un jugador presiona el botón de incremento, THE Sistema SHALL sumar 1 punto de vida al jugador objetivo y transmitir el nuevo estado a todos los jugadores conectados en la sala en un máximo de 2 segundos
4. WHEN un jugador presiona el botón de decremento, THE Sistema SHALL restar 1 punto de vida al jugador objetivo y transmitir el nuevo estado a todos los jugadores conectados en la sala en un máximo de 2 segundos
5. WHEN un jugador mantiene presionado (long-press de 500 milisegundos o más) el botón de incremento, THE Sistema SHALL sumar 10 puntos de vida al jugador objetivo y transmitir el nuevo estado a todos los jugadores conectados en la sala
6. WHEN un jugador mantiene presionado (long-press de 500 milisegundos o más) el botón de decremento, THE Sistema SHALL restar 10 puntos de vida al jugador objetivo y transmitir el nuevo estado a todos los jugadores conectados en la sala
7. THE Sistema SHALL permitir que los puntos de vida sean cualquier valor entero sin límite inferior ni superior
8. THE Cliente SHALL organizar los jugadores visibles en una cuadrícula responsiva de 1 columna en pantallas con ancho menor a 640px y 2 columnas en pantallas con ancho igual o mayor a 640px, mostrando un máximo de 6 jugadores visibles simultáneamente con capacidad de desplazamiento o paginación para acceder a los jugadores restantes
9. WHEN un jugador se une a la sala, THE Sistema SHALL inicializar sus puntos de vida con el valor correspondiente al formato de la partida (Commander: 40, 20 vida: 20, Custom: valor configurado por el creador)
10. IF el jugador objetivo no existe en la sala, THEN THE Sistema SHALL ignorar la acción de ajuste de vida y no modificar el estado de ningún jugador

### Requirement 5: Búsqueda de Comandantes vía Scryfall

**User Story:** Como jugador de Commander, quiero buscar mi comandante por nombre y ver su arte como fondo, para que la experiencia de juego sea visualmente atractiva y personalizada.

#### Acceptance Criteria

1. WHEN un jugador escribe al menos 2 caracteres en el campo de búsqueda de comandante, THE Scryfall_Service SHALL consultar la API de Scryfall con el filtro `is:commander` tras un debounce de 300 milisegundos, cancelando cualquier consulta pendiente anterior para evitar que resultados obsoletos sobrescriban resultados más recientes
2. WHEN Scryfall devuelve resultados, THE Cliente SHALL mostrar una lista desplegable con un máximo de 20 resultados mostrando imagen miniatura, nombre e identidad de color, y cerrar la lista al hacer clic fuera del componente o al presionar la tecla Escape
3. WHEN un jugador selecciona un comandante de la lista, THE Cliente SHALL almacenar en el estado del componente el nombre y la URL de art_crop de la carta, y mostrar una vista previa con la imagen miniatura, nombre e identidad de color debajo del campo de búsqueda
4. WHEN un jugador selecciona un comandante cuya carta contiene la habilidad "Partner" en su texto de oráculo, THE Cliente SHALL mostrar un segundo campo de búsqueda de comandante con la etiqueta "Partner (opcional)" permitiendo buscar y seleccionar un segundo comandante con la misma mecánica de búsqueda Scryfall
5. WHEN un jugador selecciona un segundo comandante partner, THE Cliente SHALL almacenar ambos nombres y URLs de art_crop en el estado del componente como un Par_de_Partners
6. WHILE un jugador tiene un comandante seleccionado (individual o par de partners) con una URL de art_crop válida, THE Cliente SHALL mostrar el arte del primer comandante seleccionado como imagen de fondo del panel del jugador con una superposición oscura del 60% de opacidad, escalando la imagen para cubrir todo el panel sin distorsión
7. WHEN la carta seleccionada es una carta de doble cara sin image_uris en el nivel raíz, THE Scryfall_Service SHALL obtener la imagen de la primera cara desde el array card_faces
8. IF la API de Scryfall retorna un código de estado HTTP 404 o un error de red, THEN THE Scryfall_Service SHALL retornar una lista vacía sin mostrar mensajes de error al usuario y sin afectar la funcionalidad del juego
9. IF la URL de art_crop del comandante seleccionado no carga correctamente, THEN THE Cliente SHALL mostrar el panel del jugador con el color de fondo predeterminado asignado por posición, manteniendo toda la funcionalidad del panel intacta

### Requirement 6: Daño de Comandante

**User Story:** Como jugador de Commander, quiero rastrear el daño de combate infligido por cada comandante a cada jugador, para que pueda determinar cuándo un jugador es eliminado por daño de comandante (21 puntos) y que ese daño se refleje automáticamente en la vida del jugador afectado.

#### Acceptance Criteria

1. IF el formato de juego es Commander, THEN THE Cliente SHALL mostrar un botón "Commander Damage" en el panel de cada jugador
2. WHEN un jugador activa el panel de daño de comandante de un jugador destino, THE Cliente SHALL mostrar la lista de todos los demás jugadores como fuentes de daño de comandante; si un jugador origen tiene un Par_de_Partners, THE Cliente SHALL mostrar cada comandante del par como una fuente de daño independiente con su propio valor de daño acumulado (inicializado en 0) y controles de incremento (+1) y decremento (-1)
3. WHEN un jugador incrementa el daño de comandante de una fuente específica (comandante individual o uno de un par de partners) sobre un jugador destino, THE Sistema SHALL enviar la acción con el identificador del comandante origen, el jugador destino y la cantidad (+1) al Servidor mediante WebSocket, y el Servidor SHALL reducir automáticamente la vida del jugador destino en la misma cantidad
4. WHEN un jugador decrementa el daño de comandante de una fuente específica sobre un jugador destino, THE Sistema SHALL enviar la acción con el identificador del comandante origen, el jugador destino y la cantidad (-1) al Servidor mediante WebSocket, y el Servidor SHALL incrementar automáticamente la vida del jugador destino en la misma cantidad
5. WHEN un jugador mantiene presionado (long-press de 500 milisegundos o más) el botón de incremento de daño de comandante, THE Sistema SHALL enviar la acción con cantidad +10 al Servidor mediante WebSocket, y el Servidor SHALL reducir automáticamente la vida del jugador destino en 10
6. WHEN un jugador mantiene presionado (long-press de 500 milisegundos o más) el botón de decremento de daño de comandante, THE Sistema SHALL enviar la acción con cantidad -10 al Servidor mediante WebSocket, y el Servidor SHALL incrementar automáticamente la vida del jugador destino en 10
7. THE Servidor SHALL mantener un registro de daño de comandante por cada par comandante-origen y jugador-destino (donde un jugador con partners genera dos entradas de comandante-origen independientes), inicializado en 0 al unirse cada jugador a la sala
8. IF una acción de daño de comandante resultaría en un valor inferior a 0, THEN THE Servidor SHALL establecer el valor en 0 en lugar de aplicar el decremento, sin modificar la vida del jugador destino
9. WHEN el Servidor recibe una acción de daño de comandante válida, THE Servidor SHALL actualizar el registro del par correspondiente, aplicar el ajuste de vida al jugador destino, y retransmitir el estado completo actualizado a todos los jugadores conectados en la sala dentro de 2 segundos
10. WHEN el daño de comandante acumulado de un mismo comandante-origen (individual o uno de un par de partners) sobre un jugador alcanza o supera 21 puntos, THE Cliente SHALL mostrar una indicación visual de eliminación por daño de comandante en el panel del jugador afectado, identificando cuál comandante causó la eliminación

### Requirement 7: Cuentas de Usuario

**User Story:** Como jugador, quiero crear una cuenta y autenticarme, para que mis partidas queden registradas y pueda consultar mi historial.

#### Acceptance Criteria

1. WHEN un usuario envía el formulario de registro con nombre de usuario (entre 3 y 50 caracteres), email válido (máximo 255 caracteres) y contraseña (mínimo 6 caracteres), THE Motor_de_Autenticación SHALL crear una cuenta nueva con la contraseña hasheada y confirmar la creación exitosa
2. IF un usuario intenta registrarse con un email o nombre de usuario ya existente, THEN THE Motor_de_Autenticación SHALL rechazar el registro indicando que el email o nombre de usuario ya se encuentra en uso
3. IF un usuario envía el formulario de registro con campos que no cumplen las restricciones de longitud o formato de email, THEN THE Motor_de_Autenticación SHALL rechazar el registro indicando qué campo es inválido
4. WHEN un usuario envía credenciales válidas en el formulario de login, THE Motor_de_Autenticación SHALL generar un token JWT con una expiración de 1440 minutos y devolverlo al Cliente junto con los datos básicos del usuario
5. IF un usuario envía credenciales inválidas (email no registrado o contraseña incorrecta), THEN THE Motor_de_Autenticación SHALL responder con un error de autenticación sin revelar si el fallo fue por email o contraseña
6. WHEN el Cliente recibe un token JWT tras login exitoso, THE Cliente SHALL almacenar el token en localStorage del navegador para mantener la sesión activa entre recargas de página
7. IF el token JWT ha expirado o es inválido al realizar una petición autenticada, THEN THE Motor_de_Autenticación SHALL rechazar la petición con un error indicando que el token es inválido o ha expirado
8. THE Sistema SHALL permitir el juego sin autenticación (como jugador invitado) con acceso completo a las funciones de partida, reservando el registro de historial y consulta de estadísticas exclusivamente para usuarios autenticados

### Requirement 8: Historial de Partidas

**User Story:** Como jugador autenticado, quiero ver el historial de mis partidas anteriores, para que pueda revisar los resultados y hacer seguimiento de mi progreso.

#### Acceptance Criteria

1. WHEN un usuario autenticado accede a la sección de historial, THE Módulo_de_Historial SHALL consultar todas las partidas en las que el usuario participó, ordenadas por fecha de finalización descendente, y mostrar un máximo de 50 partidas
2. WHEN el historial se muestra al usuario, THE Módulo_de_Historial SHALL mostrar para cada partida: formato de juego, fecha de finalización, lista de jugadores con nombre de usuario, resultado indicando al ganador con un emoji de corona (👑) junto a su nombre, y la causa de eliminación de cada jugador eliminado
3. WHEN el historial se muestra al usuario y la partida tuvo el contador de turnos habilitado, THE Módulo_de_Historial SHALL mostrar el conteo de turnos de la partida como valor numérico entero
4. WHEN una partida finaliza con la acción "end_game", THE Servidor SHALL persistir el estado final de la partida incluyendo: vida final de cada jugador (valor entero), daño de comandante recibido por cada jugador (desglosado por fuente), identificador del ganador, conteo total de turnos (si estaba habilitado), causa de eliminación de cada jugador eliminado, y orden de eliminación de los jugadores
5. IF un usuario no autenticado accede al historial, THEN THE Cliente SHALL mostrar una lista vacía sin mensajes de error
6. IF la consulta al servidor falla al cargar el historial, THEN THE Módulo_de_Historial SHALL mantener la lista vacía y registrar el error en consola sin mostrar mensajes de error al usuario
7. WHEN el historial se está cargando desde el servidor, THE Módulo_de_Historial SHALL mostrar un indicador de carga textual hasta que la respuesta sea recibida o transcurran 10 segundos de espera

### Requirement 9: Estadísticas de Jugador

**User Story:** Como jugador autenticado, quiero ver mis estadísticas de juego desglosadas por mazo y por rival, para que pueda entender mi rendimiento, identificar mazos dominantes y analizar enfrentamientos contra otros jugadores.

#### Acceptance Criteria

1. WHEN un usuario autenticado solicita sus estadísticas generales, THE Módulo_de_Estadísticas SHALL calcular y retornar en un máximo de 2 segundos: total de partidas completadas jugadas, total de victorias, porcentaje de victorias, y desglose de victorias por causa de eliminación (daño normal, daño de comandante, veneno)
2. THE Módulo_de_Estadísticas SHALL calcular el porcentaje de victorias como (victorias / total de partidas completadas) multiplicado por 100, redondeado a un decimal
3. IF un usuario no tiene partidas completadas registradas, THEN THE Módulo_de_Estadísticas SHALL retornar cero para total de partidas, cero para total de victorias y cero punto cero para porcentaje de victorias
4. IF un usuario no autenticado o con token inválido solicita estadísticas, THEN THE Módulo_de_Estadísticas SHALL rechazar la solicitud con un mensaje de error indicando que la autenticación es requerida
5. THE Módulo_de_Estadísticas SHALL considerar únicamente partidas finalizadas (con fecha de finalización registrada) para el cálculo de todas las métricas, excluyendo partidas activas o en progreso
6. THE Módulo_de_Estadísticas SHALL calcular y mostrar estadísticas de eliminaciones recibidas por el usuario desglosadas por causa: total de eliminaciones por daño normal (vida llegó a 0), total de eliminaciones por daño de comandante (21 o más de una misma fuente), y total de eliminaciones por veneno (10 o más contadores)
7. WHEN un usuario autenticado solicita estadísticas por mazo, THE Módulo_de_Estadísticas SHALL calcular para cada Mazo registrado en la Colección_de_Mazos del usuario: total de partidas jugadas, total de victorias, porcentaje de victorias, y lista de jugadores que han utilizado ese mismo mazo en partidas compartidas
8. WHEN un usuario autenticado solicita estadísticas por rival, THE Módulo_de_Estadísticas SHALL calcular para cada jugador contra el que el usuario ha jugado: nombre del rival, total de partidas jugadas juntos, victorias del usuario contra ese rival, y porcentaje de victorias del usuario contra ese rival
9. WHEN un usuario autenticado solicita el log de partidas, THE Módulo_de_Estadísticas SHALL mostrar una tabla con cada partida finalizada incluyendo: fecha, lista de jugadores participantes, mazo utilizado por cada jugador (si aplica), y posición de eliminación de cada jugador (permitiendo posiciones compartidas en caso de empate)
10. THE Módulo_de_Estadísticas SHALL ordenar las estadísticas por rival por total de partidas jugadas juntos en orden descendente
11. THE Módulo_de_Estadísticas SHALL ordenar las estadísticas por mazo por porcentaje de victorias en orden descendente

### Requirement 10: Gestión del Turno

**User Story:** Como jugador, quiero poder habilitar opcionalmente un contador de turnos de la partida, para que pueda tener referencia temporal del avance del juego cuando lo necesite.

#### Acceptance Criteria

1. WHILE el contador de turnos está habilitado en la configuración de la sala, WHEN un jugador conectado a la sala envía la acción "increment_turn", THE Servidor SHALL incrementar el contador de turnos de esa sala en 1 y difundir el estado actualizado a todos los jugadores conectados en la sala
2. WHILE el contador de turnos está habilitado en la sala, THE Servidor SHALL incluir el campo de conteo de turnos como un entero no negativo en cada actualización de estado enviada a los jugadores de la sala
3. WHEN la sala es creada con el contador de turnos habilitado, THE Servidor SHALL inicializar el contador de turnos en 0
4. IF un jugador envía la acción "increment_turn" y no pertenece a ninguna sala activa, THEN THE Servidor SHALL descartar la acción sin modificar ningún contador de turnos
5. WHILE el contador de turnos está deshabilitado en la configuración de la sala, THE Cliente SHALL ocultar los controles de turno de la interfaz y el Servidor SHALL ignorar las acciones "increment_turn" recibidas
6. WHEN una partida finaliza con el contador de turnos habilitado, THE Servidor SHALL incluir el conteo total de turnos en los datos persistidos de la partida
7. WHILE el contador de turnos está deshabilitado en la sala, THE Servidor SHALL persistir un valor nulo para el conteo de turnos al finalizar la partida

### Requirement 11: Formatos de Juego

**User Story:** Como jugador, quiero elegir entre diferentes formatos de Magic, para que el contador se adapte a las reglas de vida inicial de cada formato.

#### Acceptance Criteria

1. THE Sistema SHALL soportar los siguientes formatos con su vida inicial correspondiente: Commander (40), 20 vida (20), Custom (vida inicial configurable por el creador de la sala, ingresada como valor numérico entero positivo)
2. WHEN se crea una sala, THE Sistema SHALL fijar la vida inicial según el formato seleccionado y aplicarla a todos los jugadores que se unan posteriormente a la sala
3. WHEN el formato es Commander, THE Sistema SHALL habilitar las funcionalidades de búsqueda de comandante y daño de comandante en la interfaz del juego
4. WHEN el formato no es Commander, THE Sistema SHALL ocultar las funcionalidades de búsqueda de comandante y daño de comandante de la interfaz del juego
5. WHEN el formato seleccionado es Custom, THE Sistema SHALL presentar un campo de entrada numérica donde el creador de la sala ingresa el valor de vida inicial deseado antes de confirmar la creación de la sala

### Requirement 12: Interfaz Visual y Personalización

**User Story:** Como jugador, quiero que la interfaz sea visualmente atractiva con un tema oscuro y colores distintivos por jugador, para que pueda identificar rápidamente a cada participante.

#### Acceptance Criteria

1. IF un jugador no tiene imagen de comandante asignada, THEN THE Cliente SHALL mostrar como fondo de su panel el color correspondiente a su posición de ingreso a la sala, siguiendo el orden cíclico: púrpura, azul, verde, rojo, amarillo, rosa, índigo, verde azulado, naranja, cian, magenta, lima (12 colores asignados a las posiciones 1-12)
2. WHILE un jugador tiene imagen de comandante, THE Cliente SHALL usar el arte de la carta como imagen de fondo del panel del jugador, reemplazando el color asignado, con una capa de oscurecimiento superpuesta para mantener la legibilidad del texto
3. THE Cliente SHALL mostrar un borde de al menos 2px de grosor en color púrpura alrededor del panel del jugador local, diferenciándolo de los paneles de otros jugadores que no tienen borde destacado
4. WHILE un jugador está desconectado, THE Cliente SHALL mostrar una etiqueta con el texto "desconectado" en color rojo sobre un fondo semitransparente oscuro dentro del panel de ese jugador
5. THE Cliente SHALL utilizar un tema oscuro donde el color de fondo general tenga una luminosidad inferior al 15% y el texto principal tenga una luminosidad superior al 80%, garantizando un ratio de contraste mínimo de 4.5:1 entre texto y fondo

### Requirement 13: Contador de Veneno

**User Story:** Como jugador, quiero rastrear los contadores de veneno de cada jugador, para que pueda determinar cuándo un jugador es eliminado por daño de veneno (10 contadores).

#### Acceptance Criteria

1. WHILE la configuración de contadores de veneno está habilitada en la sala, THE Cliente SHALL mostrar un Contador_de_Veneno en el panel de cada jugador con el valor actual de contadores de veneno
2. WHEN un jugador se une a una sala con contadores de veneno habilitados, THE Sistema SHALL inicializar el contador de veneno del jugador en 0
3. THE Contador_de_Veneno SHALL proporcionar botones de incremento (+1) y decremento (-1) con un área táctil mínima de 44x44px
4. WHEN un jugador presiona el botón de incremento de veneno, THE Sistema SHALL sumar 1 contador de veneno al jugador objetivo y transmitir el nuevo estado a todos los jugadores conectados en la sala
5. WHEN un jugador presiona el botón de decremento de veneno, THE Sistema SHALL restar 1 contador de veneno al jugador objetivo y transmitir el nuevo estado a todos los jugadores conectados en la sala
6. WHEN un jugador mantiene presionado (long-press de 500 milisegundos o más) el botón de incremento de veneno, THE Sistema SHALL sumar 10 contadores de veneno al jugador objetivo y transmitir el nuevo estado a todos los jugadores conectados en la sala
7. WHEN un jugador mantiene presionado (long-press de 500 milisegundos o más) el botón de decremento de veneno, THE Sistema SHALL restar 10 contadores de veneno al jugador objetivo y transmitir el nuevo estado a todos los jugadores conectados en la sala
8. IF una acción de decremento de veneno resultaría en un valor inferior a 0, THEN THE Servidor SHALL establecer el valor del contador de veneno en 0 en lugar de aplicar el decremento
9. WHEN el contador de veneno de un jugador alcanza o supera 10, THE Cliente SHALL mostrar una indicación visual de eliminación por veneno en el panel del jugador afectado
10. WHILE la configuración de contadores de veneno está deshabilitada en la sala, THE Cliente SHALL ocultar el Contador_de_Veneno de todos los paneles de jugadores

### Requirement 14: Sala Local (Modo Solo)

**User Story:** Como jugador autenticado, quiero crear una sala local donde puedo añadir múltiples jugadores sin que necesiten cuentas, para que pueda usar la aplicación como un contador de vida tradicional en una mesa de juego.

#### Acceptance Criteria

1. WHEN un usuario autenticado selecciona "Crear Sala Local", THE Sistema SHALL crear una sala que funciona sin conexiones WebSocket externas, gestionada completamente por el Cliente del usuario creador
2. WHEN se crea una Sala_Local, THE Sistema SHALL presentar las mismas opciones de configuración que una sala normal: selector de formato (Commander, 20 vida, Custom), opción de habilitar contadores de veneno, y opción de habilitar contador de turnos
3. WHEN la Sala_Local es creada, THE Sistema SHALL permitir al usuario creador añadir entre 2 y 12 jugadores locales ingresando únicamente un nombre para cada Jugador_Local (entre 1 y 30 caracteres)
4. THE Sistema SHALL aplicar las mismas reglas de formato, vida inicial, daño de comandante y contadores de veneno en una Sala_Local que en una sala normal
5. THE Cliente SHALL mostrar un máximo de 6 jugadores visibles simultáneamente en la Sala_Local, con capacidad de desplazamiento o paginación para acceder a los jugadores restantes
6. WHEN la Sala_Local finaliza con la acción "end_game", THE Sistema SHALL persistir la partida en el historial del usuario autenticado que creó la sala, incluyendo los nombres de todos los Jugadores_Locales
7. THE Sistema SHALL permitir que solo el usuario autenticado creador de la Sala_Local realice acciones de ajuste de vida, daño de comandante y veneno sobre todos los Jugadores_Locales
8. IF un usuario no autenticado intenta crear una Sala_Local, THEN THE Sistema SHALL redirigir al usuario a la pantalla de login con un mensaje indicando que la autenticación es requerida para el modo local

### Requirement 15: Selección Aleatoria de Jugador Inicial

**User Story:** Como jugador, quiero que el sistema seleccione aleatoriamente quién empieza la partida, para que la decisión sea justa y entretenida.

#### Acceptance Criteria

1. WHEN al menos 2 jugadores están conectados a una sala (normal o local), THE Cliente SHALL mostrar un botón "Elegir Jugador Inicial" accesible para cualquier jugador conectado
2. WHEN un jugador presiona el botón "Elegir Jugador Inicial", THE Sistema SHALL seleccionar un jugador al azar de entre todos los jugadores activos en la sala utilizando un generador de números pseudoaleatorios
3. WHEN la selección aleatoria se inicia, THE Cliente SHALL mostrar una animación de tipo ruleta que cicla visualmente a través de los nombres de los jugadores durante un mínimo de 2 segundos y un máximo de 4 segundos antes de detenerse en el jugador seleccionado
4. WHEN la animación finaliza y el jugador seleccionado es revelado, THE Cliente SHALL resaltar visualmente al jugador elegido con un indicador distintivo (borde dorado y texto destacado) durante al menos 3 segundos
5. WHEN la selección aleatoria se ejecuta en una sala normal (WebSocket), THE Servidor SHALL determinar el jugador seleccionado y difundir el resultado a todos los jugadores conectados para que la animación se sincronice en todos los clientes
6. WHEN la selección aleatoria se ejecuta en una Sala_Local, THE Cliente SHALL determinar el jugador seleccionado localmente sin comunicación con el Servidor
7. THE Sistema SHALL permitir ejecutar la selección aleatoria múltiples veces durante una misma partida sin restricción

### Requirement 16: Detección de Último Jugador en Pie

**User Story:** Como jugador, quiero que el sistema detecte automáticamente cuándo queda un solo jugador con vida, para que pueda finalizar la partida de forma ágil.

#### Acceptance Criteria

1. WHEN solo un jugador en la sala tiene puntos de vida superiores a 0 y todos los demás jugadores tienen vida igual o inferior a 0, THE Sistema SHALL mostrar un mensaje preguntando si el usuario desea marcar la partida como finalizada
2. WHEN el usuario confirma que desea finalizar la partida tras la detección del último jugador en pie, THE Sistema SHALL ejecutar la acción "end_game" registrando al jugador con vida como ganador
3. WHEN la partida es finalizada tras la confirmación del último jugador en pie, THE Sistema SHALL mostrar un mensaje preguntando si el usuario desea iniciar una nueva partida con los mismos jugadores y la misma configuración de sala (formato, veneno, turnos)
4. WHEN el usuario confirma iniciar una nueva partida con los mismos jugadores, THE Sistema SHALL reiniciar la vida de todos los jugadores al valor inicial del formato, reiniciar contadores de veneno a 0 si están habilitados, reiniciar daño de comandante a 0 si aplica, y reiniciar el contador de turnos a 0 si está habilitado
5. IF el usuario rechaza finalizar la partida tras la detección, THEN THE Sistema SHALL cerrar el mensaje y permitir continuar la partida sin modificar ningún estado
6. IF el usuario rechaza iniciar una nueva partida tras la finalización, THEN THE Sistema SHALL mantener la pantalla de la partida finalizada mostrando el estado final
7. THE Sistema SHALL evaluar la condición de último jugador en pie únicamente cuando la sala tiene 2 o más jugadores registrados
8. WHEN un jugador previamente marcado como eliminado (vida igual o inferior a 0) recibe un incremento de vida que lo lleva por encima de 0, THE Sistema SHALL cancelar el estado de eliminación de ese jugador, eliminar su registro de Causa_de_Eliminación y su posición en el orden de eliminación, y retransmitir el estado actualizado a todos los jugadores conectados
9. WHEN el estado de eliminación de un jugador es cancelado por recuperación de vida, THE Sistema SHALL reevaluar la condición de último jugador en pie considerando al jugador revivido como activo nuevamente

### Requirement 17: Causa de Eliminación

**User Story:** Como jugador autenticado, quiero que se registre cómo fue eliminado cada jugador, para que las estadísticas reflejen las diferentes formas de perder en Magic.

#### Acceptance Criteria

1. WHEN un jugador es eliminado durante una partida, THE Sistema SHALL registrar la Causa_de_Eliminación con uno de los siguientes valores: "daño normal" (vida llegó a 0 o menos), "daño de comandante" (21 o más puntos de daño acumulado de una misma fuente de comandante), o "veneno" (10 o más contadores de veneno)
2. WHEN una acción de daño de comandante causa que el daño acumulado de una misma fuente alcance o supere 21 puntos sobre un jugador destino, y esa misma acción también causa que la vida del jugador destino llegue a 0 o menos, THEN THE Sistema SHALL registrar la causa de eliminación como "daño normal" dado que la reducción de vida a 0 es la condición determinante
3. WHEN una acción de daño de comandante causa que el daño acumulado de una misma fuente alcance o supere 21 puntos sobre un jugador destino, y la vida del jugador destino permanece por encima de 0 tras la acción, THEN THE Sistema SHALL registrar la causa de eliminación como "daño de comandante"
4. WHEN el contador de veneno de un jugador alcanza o supera 10, THE Sistema SHALL registrar la causa de eliminación como "veneno" independientemente de la vida actual del jugador
5. THE Sistema SHALL registrar el orden de eliminación de los jugadores como un valor numérico secuencial (1 para el primer eliminado, 2 para el segundo, y así sucesivamente)
6. WHEN la partida finaliza, THE Servidor SHALL persistir la causa de eliminación y el orden de eliminación de cada jugador eliminado junto con los demás datos de la partida
7. WHEN la vida de un jugador previamente eliminado por "daño normal" es incrementada por encima de 0, THE Sistema SHALL eliminar la Causa_de_Eliminación registrada y remover su posición del orden de eliminación, tratando al jugador como activo nuevamente
8. WHEN la vida de un jugador previamente eliminado por "daño de comandante" es incrementada por encima de 0, THE Sistema SHALL eliminar la Causa_de_Eliminación registrada y remover su posición del orden de eliminación, tratando al jugador como activo nuevamente
9. WHEN un jugador es revivido (eliminación cancelada por recuperación de vida), THE Sistema SHALL ajustar las posiciones del orden de eliminación de los jugadores eliminados posteriormente para mantener la secuencia numérica continua

### Requirement 18: Edición de Historial de Partidas

**User Story:** Como jugador autenticado, quiero poder editar los datos de partidas finalizadas, para que pueda corregir errores en las causas de eliminación y el orden de eliminación de los jugadores.

#### Acceptance Criteria

1. WHEN un usuario autenticado accede al detalle de una partida finalizada en la sección de historial, THE Editor_de_Historial SHALL mostrar un botón "Editar" que abre un panel de edición con los datos modificables de la partida
2. WHEN el panel de edición está abierto, THE Editor_de_Historial SHALL permitir modificar la causa de eliminación de cada jugador eliminado seleccionando entre las opciones: "daño normal", "daño de comandante", y "veneno"
3. WHEN el panel de edición está abierto, THE Editor_de_Historial SHALL permitir modificar el orden de eliminación de cada jugador eliminado ingresando un valor numérico entero positivo, permitiendo que dos o más jugadores compartan el mismo valor de posición (empate)
4. WHEN el usuario confirma los cambios en el panel de edición, THE Editor_de_Historial SHALL enviar los datos actualizados al Servidor y el Servidor SHALL persistir las modificaciones reemplazando los valores anteriores
5. IF el usuario cancela la edición, THEN THE Editor_de_Historial SHALL cerrar el panel sin modificar los datos de la partida
6. THE Editor_de_Historial SHALL permitir la edición únicamente de partidas en las que el usuario autenticado participó como jugador o como creador de la Sala_Local
7. WHEN los datos de una partida son editados, THE Módulo_de_Estadísticas SHALL recalcular las métricas afectadas (causas de eliminación y orden) utilizando los valores actualizados

### Requirement 19: Registro de Comandantes y Mazos

**User Story:** Como jugador autenticado, quiero ver un registro de todos los comandantes y mazos que he usado, para que pueda analizar el rendimiento de cada mazo, saber cuáles no he usado recientemente, y ver quién más ha jugado con un mazo específico.

#### Acceptance Criteria

1. WHEN un usuario autenticado finaliza una partida en formato Commander, THE Registro_de_Comandantes SHALL almacenar el nombre del comandante (o Par_de_Partners) utilizado asociado al usuario, al mazo de la Colección_de_Mazos (si fue seleccionado desde "Mis Mazos") y a la partida
2. WHEN un usuario autenticado accede a la sección de registro de comandantes, THE Registro_de_Comandantes SHALL mostrar una lista de todos los comandantes y mazos distintos que el usuario ha utilizado, ordenada por última fecha de uso descendente
3. THE Registro_de_Comandantes SHALL mostrar para cada comandante o mazo: nombre del comandante (o ambos nombres si es Par_de_Partners), porcentaje de victorias (victorias / partidas jugadas multiplicado por 100, redondeado a un decimal), número total de usos (partidas jugadas), fecha de la última partida en que fue utilizado, y lista de jugadores que han utilizado ese mismo mazo en partidas compartidas con el usuario
4. WHEN un usuario autenticado solicita estadísticas de un comandante o mazo específico, THE Registro_de_Comandantes SHALL calcular las métricas utilizando únicamente partidas finalizadas en las que el usuario seleccionó ese comandante o mazo
5. IF un usuario autenticado no tiene partidas finalizadas en formato Commander, THEN THE Registro_de_Comandantes SHALL mostrar una lista vacía con un mensaje indicando que no hay comandantes registrados
6. THE Registro_de_Comandantes SHALL actualizar automáticamente las estadísticas de un comandante o mazo cuando una partida asociada es editada mediante el Editor_de_Historial

### Requirement 20: Exportación CSV de Estadísticas

**User Story:** Como jugador autenticado, quiero exportar mis estadísticas en formato CSV, para que pueda analizar mis datos en herramientas externas como hojas de cálculo.

#### Acceptance Criteria

1. WHEN un usuario autenticado accede a la sección de estadísticas, THE Exportador_CSV SHALL mostrar un botón "Exportar CSV" visible en la interfaz
2. WHEN el usuario presiona el botón "Exportar CSV", THE Exportador_CSV SHALL generar un archivo CSV que contenga todas las tablas de estadísticas del usuario: estadísticas generales (porcentaje de victorias, conteo de victorias, total de partidas jugadas, desglose de causas de eliminación), estadísticas por mazo (nombre del mazo o comandante, total de partidas, victorias, porcentaje de victorias, jugadores que lo han usado), estadísticas por rival (nombre del rival, total de partidas juntos, victorias del usuario, porcentaje de victorias), y log de partidas (fecha, jugadores, mazos, posición de eliminación de cada jugador)
3. THE Exportador_CSV SHALL generar el archivo CSV con codificación UTF-8, separador de coma, y una fila de encabezados descriptivos en español para cada sección de datos, separando cada tabla con una fila vacía y un encabezado de sección
4. WHEN el archivo CSV es generado, THE Cliente SHALL iniciar la descarga automática del archivo con el nombre formato "estadisticas_{nombre_usuario}_{fecha_YYYYMMDD}.csv"
5. IF el usuario no tiene datos de estadísticas, THEN THE Exportador_CSV SHALL generar un archivo CSV con las filas de encabezados y valores en cero para todas las métricas
6. THE Exportador_CSV SHALL incluir los datos de estadísticas por mazo únicamente si el usuario tiene al menos una partida finalizada con un mazo registrado en la Colección_de_Mazos o en formato Commander
7. THE Exportador_CSV SHALL incluir la tabla de log de partidas con una fila por cada jugador participante en cada partida, permitiendo posiciones de eliminación compartidas (empate) representadas con el mismo valor numérico

### Requirement 21: Colección de Mazos ("Mis Mazos")

**User Story:** Como jugador autenticado, quiero registrar y gestionar mis mazos personales, para que pueda seleccionarlos rápidamente al unirme a partidas sin buscar de nuevo en Scryfall cada vez.

#### Acceptance Criteria

1. WHEN un usuario autenticado accede a la sección "Mis Mazos", THE Colección_de_Mazos SHALL mostrar la lista de todos los mazos registrados por el usuario, ordenados por fecha de última utilización descendente
2. WHEN un usuario autenticado selecciona "Añadir Mazo" con formato Commander, THE Colección_de_Mazos SHALL presentar el buscador de Scryfall para seleccionar el comandante del mazo (incluyendo soporte para Partner con un segundo campo de búsqueda si la carta seleccionada tiene la habilidad Partner)
3. WHEN un usuario autenticado selecciona "Añadir Mazo" con un formato diferente a Commander (20 vida o Custom), THE Colección_de_Mazos SHALL presentar un campo de texto libre donde el usuario ingresa un nombre personalizado para identificar el mazo (entre 1 y 100 caracteres)
4. WHEN un usuario confirma la creación de un mazo, THE Colección_de_Mazos SHALL almacenar el mazo con los siguientes datos: nombre o comandante (o Par_de_Partners), formato asociado (Commander, 20 vida, o Custom), y estado inicial "activo"
5. THE Colección_de_Mazos SHALL permitir al usuario cambiar el estado de cada mazo entre "activo" e "inactivo" para organizar mazos que ya no utiliza sin eliminarlos
6. THE Colección_de_Mazos SHALL mostrar para cada mazo: nombre o comandante (ambos nombres si es Par_de_Partners), formato, estado (activo/inactivo), y estadísticas resumidas (total de partidas jugadas y porcentaje de victorias) obtenidas del Módulo_de_Estadísticas
7. WHEN un usuario autenticado se une a una sala o crea una Sala_Local, THE Sistema SHALL presentar un toggle "Mis Mazos" junto al buscador de comandante o campo de nombre, que al activarse muestra la lista filtrada de mazos activos del usuario cuyo formato coincide con el formato de la sala
8. WHEN el toggle "Mis Mazos" está activo y el usuario selecciona un mazo de la lista, THE Sistema SHALL pre-rellenar los datos del comandante (nombre, imagen art_crop, y segundo partner si aplica) o el nombre del mazo según corresponda al formato
9. WHEN un usuario juega una partida utilizando un mazo seleccionado desde "Mis Mazos", THE Sistema SHALL asociar esa partida al mazo en la Colección_de_Mazos para alimentar las Estadísticas_por_Mazo
10. IF un usuario autenticado no tiene mazos registrados, THEN THE Colección_de_Mazos SHALL mostrar un mensaje indicando que no hay mazos registrados y un botón para añadir el primer mazo
11. THE Colección_de_Mazos SHALL permitir al usuario eliminar un mazo de su colección, manteniendo intactas las estadísticas históricas de partidas jugadas con ese mazo
