
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Video, Image, Music } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            CPL Manager
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-3xl mx-auto">
            Gestiona tu Contenido Programado de Lanzamiento multimedia de forma eficiente. 
            Crea CPLs con texto, video, imágenes y audio para tus grupos de destino.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3">
                Comenzar Ahora
              </Button>
            </Link>
            <Link to="/auth">
              <Button 
                size="lg" 
                variant="outline" 
                className="border-gray-700 text-gray-300 hover:bg-gray-800 text-lg px-8 py-3"
              >
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
                Soporte completo para texto, video, imágenes y audio en un solo CPL
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

        <div className="text-center">
          <Card className="bg-gray-900 border-gray-800 max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl text-white">
                ¿Por qué elegir CPL Manager?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-blue-400 mb-2">
                    Multi-tipo de Contenido
                  </h3>
                  <p className="text-gray-400 mb-4">
                    Combina texto, videos de YouTube, imágenes y audios en un solo CPL para máximo impacto.
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
                    Autenticación segura y almacenamiento privado para cada usuario.
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
