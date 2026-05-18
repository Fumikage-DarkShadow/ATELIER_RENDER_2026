output "service_name" {
  value = render_web_service.flask_app.name
}

output "adminer_name" {
  value = render_web_service.adminer.name
}
