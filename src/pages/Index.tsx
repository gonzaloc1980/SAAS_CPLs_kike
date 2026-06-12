
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Video, Image, LogIn } from "lucide-react";
import ContactForm from "@/components/ContactForm";
import blasterLogo from '../assets/blaster.jpg';

const Index = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <img 
            src={blasterLogo}
            alt="Blaster Logo" 
            className="mx-auto mb-6 h-24 md:h-32 w-auto object-contain"
          />
          <p className="text-xl text-gray-400 mb-8 max-w-3xl mx-auto">
            Gestiona tu Contenido Programado de Lanzamiento multimedia de forma eficiente. 
            Crea CPLs con texto, video, imágenes y audio para tus grupos de destino.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3">
                <LogIn className="h-5 w-5 mr-2" />
                Iniciar Sesión
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="bg-gray-900 border-gray-800 text-center">
            <CardHeader>
              <Calendar className="h-8 w-8 mx-auto text-blue-400 mb-2" />
              <CardTitle className="text-white">Programación</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-400">
                Programa tus contenidos con fechas específicas y horarios personalizados
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800 text-center">
            <CardHeader>
              <Video className="h-8 w-8 mx-auto text-purple-400 mb-2" />
              <CardTitle className="text-white">Multimedia</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-400">
                Soporte completo en formatos de texto, video, imágen y audio para tus CPL's
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800 text-center">
            <CardHeader>
              <Users className="h-8 w-8 mx-auto text-green-400 mb-2" />
              <CardTitle className="text-white">Grupos</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-400">
                Organiza y gestiona grupos de destinatarios para tus campañas
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800 text-center">
            <CardHeader>
              <Image className="h-8 w-8 mx-auto text-yellow-400 mb-2" />
              <CardTitle className="text-white">Almacenamiento</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-400">
                Almacenamiento seguro en la nube para todos tus archivos multimedia
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Sección del formulario de contacto */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">
              ¿Interesado en Blaster?
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Descubre cómo Blaster puede transformar tu gestión de contenido multimedia
            </p>
          </div>
          <ContactForm />
        </div>

        <div className="text-center">
          <Card className="bg-gray-900 border-gray-800 max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl text-white">
                ¿Por qué elegir Blaster?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-blue-400 mb-2">
                    Multi-tipo de Contenido
                  </h3>
                  <p className="text-gray-400 mb-4">
                    Envía contenidos de texto, video, imágen ó audio para crear CPL´s de alto impacto.
                  </p>
                  
                  <h3 className="text-lg font-semibold text-purple-400 mb-2">
                    Interfaz Intuitiva
                  </h3>
                  <p className="text-gray-400">
                    Diseño moderno y responsive que funciona perfectamente en cualquier dispositivo.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-400 mb-2">
                    Gestión de Grupos
                  </h3>
                  <p className="text-gray-400 mb-4">
                    Organiza tus audiencias en grupos y direcciona contenido específico a cada uno.
                  </p>
                  
                  <h3 className="text-lg font-semibold text-yellow-400 mb-2">
                    Seguridad Total
                  </h3>
                  <p className="text-gray-400">
                    Autenticación segura y almacenamiento privado para cada usuario autorizado.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
