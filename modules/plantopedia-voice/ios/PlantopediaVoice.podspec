Pod::Spec.new do |s|
  s.name = 'PlantopediaVoice'
  s.version = '0.1.0'
  s.summary = 'Foreground duplex PCM audio for Plantopedia'
  s.description = s.summary
  s.license = { :type => 'MIT' }
  s.author = 'Plantopedia'
  s.homepage = 'https://plantopedia.app'
  s.platforms = { :ios => '16.0' }
  s.source = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,mm,swift}'
end
